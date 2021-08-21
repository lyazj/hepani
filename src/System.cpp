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
#include "HepMC2Extension.h"

#include <fstream>
#include <algorithm>
#include <utility>

#include <stdlib.h>
#include <time.h>

using namespace CTjson;
using namespace std;
using namespace HepMC3;

namespace Hepani {

bool System::load_py8log(istream &is)
{
  string buf;
  while(getline(is, buf) && buf.find("complete event") == buf.npos);
  while(getline(is, buf) && buf.find("no") == buf.npos);

  Particles pps;
  while(true)
  {
    Particle8 *pp(new Particle8);
    if(is >> *pp && pp->no == pps.size())
      pps.emplace_back(pp);
    else
    {
      delete pp;
      break;
    }
  }

  is.clear();
  getline(is, buf);
  if(buf.find("sum") == buf.npos)
  {
    cerr << "Invalid pythia8 running log." << endl;
    return false;
  }

  for(uint32_t i = 0; i < pps.size(); ++i)
  {
    for(uint32_t m : ((Particle8 *)pps[i].get())->mothers)
      if(m >= pps.size())
      {
        cerr << "Invalid mother index: " + to_string(m) + "." << endl;
        return false;
      }
      else if(m)
      {
        pps[i]->momset.insert(m);
        pps[m]->dauset.insert(i);
      }
    if(pps[i]->momset.empty() && i)
    {
      pps[i]->momset.insert(0);
      pps[0]->dauset.insert(i);
    }
    for(uint32_t d : ((Particle8 *)pps[i].get())->daughters)
      if(d >= pps.size())
      {
        cerr << "Invalid daughter index: " + to_string(d) + "." << endl;
        return false;
      }
      else if(d)
      {
        pps[i]->dauset.insert(d);
        pps[d]->momset.insert(i);
      }
  }

  swap(particles, pps);
  return true;
}

bool System::load_hepmc2(istream &is)
{
  HepMC2RandomAccessor h2ra(is);
  GenEvent evt;

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wparentheses"
  if(event_index == (uint32_t)-1 && !h2ra.read_event(evt)
      || event_index != (uint32_t)-1 && !h2ra.read_event(event_index, evt))
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
      cerr << "Invalid particle index: " + to_string(no) + "." << endl;
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
        cerr << "Invalid mother index: " + to_string(m) + "." << endl;
        return false;
      }
      pp->momset.insert(m);
    }
    for(GenParticlePtr pdau : pgp->children())
    {
      uint32_t d(pdau->id());
      if(!d || d >= pps.size())
      {
        cerr << "Invalid daughter index: " + to_string(d) + "." << endl;
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

  particle_dj_index.clear();
  for(const ParticlePtr &pp : particles)
    particle_dj_index[pp->dj_find(particles)].push_back(pp);
  particle_index.clear();
  for(auto p : particle_dj_index)
  {
    uint32_t birth;
    try {
      birth = get_birth(p.second);
    }
    catch(const runtime_error &err) {
      cerr << err.what() << endl;
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

void System::build_timeline()
{
  timeline.build(particle_index.size());
}

bool System::find_central_phase()
{
  auto find = [&](uint32_t status) {
    for(const Particles &pps : particle_index)
      for(const ParticlePtr &pp : pps)
        if(abs(pp->status) == status)
          return pp->birth;
    return phase_undef;
  };
  for(uint32_t status : {22, 23, 21})
    if((central_phase = find(status)) != phase_undef)
      break;
  if(central_phase == phase_undef)
  {
    cerr << "Cannot find central phase." << endl;
    return false;
  }
  return true;
}

void System::calc_dynamics()
{
  particle_index[0][0]->r = {0.0};
  if(particle_index.size() > 1)
    for(const ParticlePtr &pp : particle_index[1])
      pp->set_position({0.0}, central_phase, timeline);
  for(uint32_t phase = 2; phase < particle_index.size(); ++phase)
    for(const ParticlePtr &pp : particle_index[phase])
    {
      double e_sum(0.0);
      pp->r = {0.0};
      for(uint32_t m : pp->momset)
      {
        e_sum +=
          particles[m]->e;
        pp->r +=
          particles[m]->e * particles[m]->get_position(phase, timeline);
      }
      pp->r /= e_sum;  // NAN(C++) -> null(JSON) -> NaN(js) -> 0(three.js)
    }
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
  if(!build_index())
    return false;
  build_timeline();
  if(!find_central_phase())
    return false;
  calc_dynamics();
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
      "central", central_phase,
      "particles", particle_index
  );
  if(!os)
    cerr << "Error writing output." << endl;
  return os << endl;
}

}  // namesapce Hepani
