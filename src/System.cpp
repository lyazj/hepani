/*  Copyright (C) 2021 @lyazj
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

#include "System.h"
#include "HepMCExtension.h"

#include <fstream>
#include <algorithm>
#include <utility>
#include <queue>
#include <random>
#include <iterator>

#include <stdlib.h>
#include <time.h>

#ifdef _WIN32
#define DEVNULL ("nul")
#else
#define DEVNULL ("/dev/null")
#endif

using namespace CTjson;
using namespace std;
using namespace HepMC3;

namespace Hepani {

namespace {

void read_until_eof(istream &is)
{
  static ofstream ofs(DEVNULL);
  ostringstream oss;
  (ofs ? (ostream &)ofs : (ostream &)oss) << is.rdbuf();
}

}  // namespace

bool System::load_py8log(istream &is)
{
  string buf;
  while(getline(is, buf) && buf.find("complete event") == buf.npos);
  while(getline(is, buf) && buf.find("no") == buf.npos);

  size_t lines(1);
  while(getline(is, buf) && buf.find("(system)") == buf.npos)
    ++lines;
  istringstream iss(buf);

  Particles pps;
  Particle8 *pp(new Particle8);
  if(iss >> *pp)
  {
    for(size_t i = 1; i < lines; ++i)
      if(!getline(is, buf))
        break;
    while(true)
    {
      if(pp->no != pps.size())
        break;
      pps.emplace_back(pp);
      if(!(is >> *(pp = new Particle8)))
        break;
      for(size_t i = 0; i < lines; ++i)
        if(!getline(is, buf))
          break;
    }
  }
  delete pp;

  is.clear();
  getline(is, buf);
  read_until_eof(is);
  if(buf.find("sum") == buf.npos)
  {
    cerr << "Invalid pythia8 running log." << endl;
    return false;
  }

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wparentheses"
  for(uint32_t i = 0; i < pps.size(); ++i)
  {
    Particle8 *pp8((Particle8 *)pps[i].get());
    uint32_t (&mothers)[2](pp8->mothers);
    uint32_t (&daughters)[2](pp8->daughters);
    uint32_t status(abs(pp8->status));
    for(uint32_t m : mothers)
      if(m >= pps.size())
      {
        cerr << "Invalid mother index: " << m << "." << endl;
        return false;
      }
      else if(m)
      {
        pps[i]->momset.insert(m);
        pps[m]->dauset.insert(i);
      }
    if(status > 80 && status < 87 || status > 100 && status < 107)
      if(mothers[0])
        for(uint32_t m = mothers[0] + 1; m < mothers[1]; ++m)
        {
          pps[i]->momset.insert(m);
          pps[m]->dauset.insert(i);
        }
    if(pps[i]->momset.empty() && i)
    {
      pps[i]->momset.insert(0);
      pps[0]->dauset.insert(i);
    }
    for(uint32_t d : daughters)
      if(d >= pps.size())
      {
        cerr << "Invalid daughter index: " << d << "." << endl;
        return false;
      }
      else if(d)
      {
        pps[i]->dauset.insert(d);
        pps[d]->momset.insert(i);
      }
    if(daughters[0])
      for(uint32_t d = daughters[0] + 1; d < daughters[1]; ++d)
      {
        pps[i]->dauset.insert(d);
        pps[d]->momset.insert(i);
      }
  }
#pragma GCC diagnostic pop

  swap(particles, pps);
  return true;
}

template<class Accessor>
inline bool System::load_hepmc(istream &is)
{
  stringstream ss;
  ss << is.rdbuf();
  Accessor hra(ss);
  GenEvent evt;

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wparentheses"
  if(event_index == (uint32_t)-1 && !hra.read_event(evt)
      || event_index != (uint32_t)-1 && !hra.read_event(event_index, evt))
  {
    cerr << "Invalid HepMC2 file or index out of range." << endl;
    return false;
  }
#pragma GCC diagnostic pop

  Particles pps;
  pps.emplace_back(new Particle(particle_zero));
  pps.resize(evt.particles().size() + 1);
  for(GenParticlePtr pgp : evt.particles())
  {
    uint32_t no(pgp->id());
    if(!no || no >= pps.size())
    {
      cerr << "Invalid particle index: " << no << "." << endl;
      return false;
    }

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
    Particle *pp(new Particle(ParticleBase {
      .no = no,
      .id = pgp->pid(),
      .status = pgp->status(),
      .colours = { },
      .m = pgp->generated_mass(),
    }));
#pragma GCC diagnostic pop

    vector<string> attribs(pgp->attribute_names());
    if(find(attribs.begin(), attribs.end(), "flow1") != attribs.end())
      pp->colours[0] = pgp->attribute<IntAttribute>("flow1")->value();
    if(find(attribs.begin(), attribs.end(), "flow2") != attribs.end())
      pp->colours[1] = pgp->attribute<IntAttribute>("flow2")->value();
    const FourVector &momentum(pgp->momentum());
    pp->p = { momentum.px(), momentum.py(), momentum.pz() };
    pp->e = momentum.e();
    for(GenParticlePtr pmom : pgp->parents())
    {
      uint32_t m(pmom->id());
      if(!m || m >= pps.size())
      {
        cerr << "Invalid mother index: " << m << "." << endl;
        return false;
      }
      pp->momset.insert(m);
    }
    for(GenParticlePtr pdau : pgp->children())
    {
      uint32_t d(pdau->id());
      if(!d || d >= pps.size())
      {
        cerr << "Invalid daughter index: " << d << "." << endl;
        return false;
      }
      pp->dauset.insert(d);
    }
    if(pp->momset.empty())
    {
      pp->momset.insert(0);
      pps[0]->dauset.insert(no);
    }
    pp->initialize();
    pps[no].reset(pp);
  }

  for(const ParticlePtr &pp : pps)
    if(!pp)
    {
      cerr << "Incomplete HepMC2 file." << endl;
      return false;
    }
  swap(particles, pps);
  return true;
}

bool System::load_hepmc2(istream &is)
{
  return load_hepmc<HepMC2RandomAccessor>(is);
}

bool System::load_hepmc3(istream &is)
{
  return load_hepmc<HepMC3RandomAccessor>(is);
}

uint32_t System::get_birth(Particles &dj_union) noexcept(false)
{
  if(dj_union[0]->birth == phase_undef)
  {
    static unsigned recursive_depth = 0;
    if(++recursive_depth > particle_dj_index.size())
    {
      recursive_depth = 0;
      throw runtime_error("Maximum recursive depth exceeded.");
    }

    set<uint32_t> dj_moms;
    for(const ParticlePtr &pp : dj_union)
      for(uint32_t m : pp->momset)
        dj_moms.insert(particles[m]->dj_find(particles));
    uint32_t birth(0);
    for(uint32_t m : dj_moms)
      birth = max(birth, get_birth(particle_dj_index[m]) + 1);
    for(const ParticlePtr &pp : dj_union)
      pp->birth = birth;

    --recursive_depth;
  }
  return dj_union[0]->birth;
}

bool System::build_index()
{
  if(particles.empty())
  {
    cerr << "Empty particle list." << endl;
    return false;
  }

  for(const ParticlePtr &pp : particles)
  {
    auto i2(pp->dauset.begin());
    if(i2 == pp->dauset.end())
      continue;
    auto i1(i2++);
    while(i2 != pp->dauset.end())
      particles[*i1]->dj_union(*particles[*i2++], particles);
  }

  map<uint32_t, Particles> par_dj_index;
  vector<Particles> par_index;
  swap(particle_index, par_index);
  swap(particle_dj_index, par_dj_index);

  for(const ParticlePtr &pp : particles)
    particle_dj_index[pp->dj_find(particles)].push_back(pp);
  for(auto p : particle_dj_index)
  {
    uint32_t birth;
    try {
      birth = get_birth(p.second);
    }
    catch(const runtime_error &err) {
      cerr << err.what() << endl;
      swap(particle_index, par_index);
      swap(particle_dj_index, par_dj_index);
      return false;
    }
    if(particle_index.size() <= birth)
      particle_index.resize(birth + 1);
    particle_index[birth].insert(
        particle_index[birth].end(), p.second.begin(), p.second.end());
  }

  for(const ParticlePtr &pp : particles)
  {
    if(pp->dauset.empty())
      continue;
    pp->death = particles[*pp->dauset.begin()]->birth;
  }

  return true;
}

bool System::find_centrals()
{
  uint32_t c_phase(phase_undef);
  Particles c_particles;
  uint32_t c_status((uint32_t)-1);

  auto find = [&](uint32_t object_status) {
    for(const Particles &pps : particle_index)
      for(const ParticlePtr &pp : pps)
      {
        uint32_t status(abs(pp->status));
        if(c_status == (uint32_t)-1)
        {
          if(status == object_status)
          {
            c_phase = pp->birth;
            c_particles.push_back(pp);
            c_status = status;
          }
        }
        else if(status == c_status)
          c_particles.push_back(pp);
      }
    return c_status;
  };
  for(uint32_t object_status : {22, 23, 21, 24})
    if(find(object_status) != (uint32_t)-1)
      break;

  if(c_status == (uint32_t)-1)
  {
    c_phase = min((size_t)2, particle_index.size() - 1);
    c_particles = particle_index[c_phase];
    c_status = c_particles[0]->status;
  }
  // {
  //   cerr << "Cannot find central particles." << endl;
  //   return false;
  // }
  swap(central_phase, c_phase);
  swap(central_particles, c_particles);
  swap(central_status, c_status);
  return true;
}

void System::build_timeline()
{
  timeline.build(particle_index.size());
}

// void System::calc_dynamics()
// {
//   particle_index[0][0]->r = {0.0};
//   if(particle_index.size() > 1)
//     for(const ParticlePtr &pp : particle_index[1])
//       pp->set_position({0.0}, central_phase, timeline);
//   for(uint32_t phase = 2; phase < particle_index.size(); ++phase)
//     for(const ParticlePtr &pp : particle_index[phase])
//     {
//       double e_sum(0.0);
//       pp->r = {0.0};
//       for(uint32_t m : pp->momset)
//       {
//         e_sum +=
//           particles[m]->e;
//         pp->r +=
//           particles[m]->e * particles[m]->get_position(phase, timeline);
//       }
//       // NAN(C++) -> null(JSON) -> NaN(js) -> 0(three.js)
//       pp->r /= e_sum;
//     }
// }

/* 粒子母亲优先级规则：
 * （一）birth大的母亲优先（调用max_element实现）
 * （二）birth相同，e大的母亲优先（调用stable_sort实现）
 * （三）birth和e相同，no小的母亲优先（由set的有序性保证）
 * 算法思想：低位优先排序
 */
// uint32_t System::get_main_mother(Particle &particle)
// {
//   if(particle.main_mother == (uint32_t)-1 && !particle.momset.empty())
//   {
//     vector<uint32_t> moms(particle.momset.begin(), particle.momset.end());
//     stable_sort(moms.begin(), moms.end(),
//         [&](uint32_t m1, uint32_t m2) {
//           return particles[m1]->e > particles[m2]->e;
//         });
//     particle.main_mother = *max_element(moms.begin(), moms.end(),
//         [&](uint32_t m1, uint32_t m2) {
//           return particles[m1]->birth < particles[m2]->birth;
//         });
//   }
//   return particle.main_mother;
// }

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-variable"
uint32_t System::get_main_mother(Particle &particle)
{
  if(particle.main_mother == (uint32_t)-1 && !particle.momset.empty())
  {
    static default_random_engine dre(time(NULL));
    static bool dre_init((dre.discard(1), true));
    uniform_int_distribution<size_t> uid(0, particle.momset.size() - 1);
    particle.main_mother = *next(particle.momset.begin(), uid(dre));
  }
  return particle.main_mother;
}
#pragma GCC diagnostic pop

bool System::calc_dynamics()
{
  map<ParticlePtr, ParticlePtr> initial;
  for(const ParticlePtr &pp : central_particles)
  {
    pp->set_position({0.0}, central_phase, timeline);
    for(uint32_t m : pp->momset)
      if(m)
        initial[particles[m]] = pp;
  }

  queue<pair<ParticlePtr, ParticlePtr>> waiting;
  for(const pair<ParticlePtr, ParticlePtr> &p : initial)
    waiting.push(p);
  while(!waiting.empty())
  {
    ParticlePtr pm(waiting.front().first), pd(waiting.front().second);
    waiting.pop();
    if(!pm->r.isnan())
    {
      cerr << "Conflicted main mother detacted." << endl;
      return false;
    }
    pm->set_position(pd->r, pd->birth, timeline);
    uint32_t mm(get_main_mother(*pm));
    if(mm != (uint32_t)-1 && mm)
      waiting.emplace(particles[mm], pm);
  }

  particle_index[0][0]->r = {0.0};
  if(particle_index.size() > 1)
    for(const ParticlePtr &pp : particle_index[1])
      if(pp->r.isnan())
        pp->r = {0.0};
  for(uint32_t phase = 2; phase < particle_index.size(); ++phase)
    for(ParticlePtr &pp : particle_index[phase])
      pp->r =
        particles[get_main_mother(*pp)]->get_position(phase, timeline);

  return true;
}

void System::write_time_stamp()
{
  time_t now(time(0));
  char buf[64]{0};
  strftime(buf, sizeof(buf) - 1,
      "%a, %d %b %Y %H:%M:%S GMT", gmtime(&now));
  time_stamp.assign(buf);
}

bool System::process_all()
{
  if(!build_index() || !find_centrals())
    return false;
  build_timeline();
  if(!calc_dynamics())  // not atomic
    return false;
  write_time_stamp();
  return true;
}

bool System::from_py8log(istream &is)
{
  input_type.assign("py8log");
  return load_py8log(is) && process_all();
}

bool System::from_hepmc2(istream &is)
{
  input_type.assign("hepmc2");
  return load_hepmc2(is) && process_all();
}

bool System::from_hepmc3(istream &is)
{
  input_type.assign("hepmc3");
  return load_hepmc3(is) && process_all();
}

ostream &System::to_json(ostream &os) const
{
  ojsonstream ojs(os.rdbuf());
  ojs.setbreakline(0).setspace(0);
  ojs.base() << scientific << setprecision(3);
  prt_obj(
      ojs,
      "input", input_type,
      "event", event_index,
      "stamp", time_stamp,
      KVP(timeline),
      KVP(central_phase),
      KVP(central_particles),
      KVP(central_status),
      "particles", particle_index
  );
  if(!os)
    cerr << "Error writing output." << endl;
  return os;
}

ostream &System::to_js(ostream &os) const
{
  os << "function requestJSONLocal(){receiveJSONContent(\'";

  ostringstream oss;
  if(!to_json(oss))
  {
    os.setstate(oss.rdstate());
    return os;
  }
  for(char c : oss.str())
    if(c == '\'')
      os << "\\\'";
    else
      os << c;
  if(!os)
    cerr << "Error writing output." << endl;

  return os << "\')}";
}

}  // namesapce Hepani
