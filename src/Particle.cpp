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

#include "Particle.h"
#include "NameCache.h"

using namespace CTjson;
using namespace std;

namespace Hepani {

const Particle particle_zero(ParticleBase {
  .no = 0,
  .id = 90,
  .name = "(system)",
  .status = 11,
  .colours = {0},
  .r = array_nan,
  .v = {0.0},
  .p = {0.0},
  .e = 0.0,
  .m = 0.0,
  .birth = phase_undef,
  .death = phase_undef,
  .momset = { },
  .dauset = { },
  .dj_parent = 0,
  .dj_rank = 0,
  .main_mother = (uint32_t)-1,
});

ojsonstream &Particle::print(ojsonstream &ojs) const
{
  return prt_obj(
      ojs,
      KVP(no),
      KVP(id),
      KVP(name),
      KVP(status),
      KVP(colours),
      KVP(r),
      KVP(v),
      KVP(e),
      KVP(m),
      KVP(birth),
      KVP(death),
      KVP(momset),
      KVP(dauset),
      "mainMother", main_mother
  );
}

void Particle::initialize()
{
  string *pname(name_cache.find(id));
  if(pname)
    name = *pname;
  r = array_nan,
  v = e ? p / e : Array{0.0, 0.0, 1.0};
  birth = death = phase_undef;
  dj_parent = no;
  dj_rank = 0;
  main_mother = (uint32_t)-1;
}

bool operator<(const Particle &p1, const Particle &p2)
{
  return p1.no < p2.no;
}
bool operator>(const Particle &p1, const Particle &p2)
{
  return p1.no > p2.no;
}
bool operator==(const Particle &p1, const Particle &p2)
{
  return p1.no == p2.no;
}
bool operator<=(const Particle &p1, const Particle &p2)
{
  return p1.no <= p2.no;
}
bool operator>=(const Particle &p1, const Particle &p2)
{
  return p1.no >= p2.no;
}

void Particle::dj_union(Particle &other, vector<ParticlePtr> &pps)
{
  uint32_t root(dj_find(pps)), root_other(other.dj_find(pps));
  if(root == root_other)
    return;
  if(pps[root]->dj_rank > pps[root_other]->dj_rank)
    pps[root_other]->dj_parent = root;
  else if(pps[root]->dj_rank < pps[root_other]->dj_rank)
    pps[root]->dj_parent = root_other;
  else
  {
    pps[root_other]->dj_parent = root;
    ++pps[root]->dj_rank;
  }
}

uint32_t Particle::dj_find(vector<ParticlePtr> &pps)
{
  if(dj_parent == no)
    return no;
  return dj_parent = pps[dj_parent]->dj_find(pps);
}

Array Particle::get_position(
    uint32_t phase, const Timeline &timeline) const
{
  return r + v * timeline.get_span(phase, birth);
}

void Particle::set_position(
    const Array &pos, uint32_t phase, const Timeline &timeline)
{
  r = pos + v * timeline.get_span(birth, phase);
}

istream &operator>>(istream &is, Particle8 &particle8)
{
  is >> particle8.no >> particle8.id;
  is >> particle8.name >> particle8.status;
  is >> particle8.mothers[0] >> particle8.mothers[1];
  is >> particle8.daughters[0] >> particle8.daughters[1];
  is >> particle8.colours[0] >> particle8.colours[1];
  is >> particle8.p[0] >> particle8.p[1] >> particle8.p[2];
  is >> particle8.e >> particle8.m;
  particle8.initialize();
  return is;
}

}  // namesapce Hepani
