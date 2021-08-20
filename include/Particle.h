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

#pragma once

#include "Array.h"

#include <set>
#include <vector>

namespace Hepani {

constexpr uint32_t phase_undef = (uint32_t)-1;

class Particle;

typedef std::shared_ptr<Particle> ParticlePtr;

struct ParticleBase {
  uint32_t            no;
  int32_t             id;
  std::string         name;
  int32_t             status;
  uint32_t            colours[2];
  Array               r;
  Array               v;
  Array               p;
  double              e;
  double              m;
  uint32_t            birth;
  uint32_t            death;
  std::set<uint32_t>  momset;
  std::set<uint32_t>  dauset;
  uint32_t            dj_parent;
  uint32_t            dj_rank;
};

struct Particle : ParticleBase {
  Particle() = default;
  Particle(const ParticleBase &base) : ParticleBase(base) { }
  Particle(ParticleBase &&base) : ParticleBase(base) { }
  Particle(const Particle &) = default;
  Particle &operator=(const Particle &) = default;
  Particle(Particle &&) = default;
  Particle &operator=(Particle &&) = default;
  virtual ~Particle() = default;

  void initialize();
  void dj_union(Particle &, std::vector<ParticlePtr> &);
  uint32_t dj_find(std::vector<ParticlePtr> &);
  CTjson::ojsonstream &print(CTjson::ojsonstream &) const;
};

extern const Particle particle_zero;

struct Particle8 : Particle {
  double mothers[2];
  double daughters[2];
};

std::istream &operator>>(std::istream &, Particle8 &);

}  // namespace Hepani
