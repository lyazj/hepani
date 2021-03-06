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
#include "Timeline.h"

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
  uint32_t            main_mother;
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
  Array get_position(uint32_t, const Timeline &) const;
  void set_position(const Array &, uint32_t, const Timeline &);
  CTjson::ojsonstream &print(CTjson::ojsonstream &) const;
};

bool operator<(const Particle &, const Particle &);
bool operator>(const Particle &, const Particle &);
bool operator==(const Particle &, const Particle &);
bool operator<=(const Particle &, const Particle &);
bool operator>=(const Particle &, const Particle &);

extern const Particle particle_zero;

struct Particle8 : Particle {
  uint32_t mothers[2];
  uint32_t daughters[2];
};

std::istream &operator>>(std::istream &, Particle8 &);

}  // namespace Hepani
