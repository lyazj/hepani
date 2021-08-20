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

#include "Particle.h"
#include "Timeline.h"

namespace Hepani {

typedef std::vector<ParticlePtr> Particles;
typedef std::vector<Particles> ParticleIndex;
typedef std::map<uint32_t, Particles> ParticleDJIndex;

class System {
public:
  bool from_py8log(std::istream &);
  bool from_hepmc2(std::istream &, size_t = (size_t)-1);
  std::ostream &to_json(std::ostream &) const;

// private:
  std::string      input_type;
  std::string      time_stamp;
  Particles        particles;
  ParticleIndex    particle_index;
  ParticleDJIndex  particle_dj_index;
  Timeline         timeline;
  uint32_t         central_phase;

  bool load_py8log(std::istream &);
  bool load_hepmc2(std::istream &, size_t);
  bool process_all();

  bool build_index();
  void build_timeline();
  uint32_t find_central_phase();
  void calc_dynamics();
  void write_time_stamp();

  uint32_t get_birth(Particles &) noexcept(false);
};

}  // namespace Hepani
