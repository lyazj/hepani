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

namespace Hepani {

typedef std::vector<ParticlePtr> Particles;
typedef std::vector<Particles> ParticleIndex;

class System {
public:
  uint32_t         event_index = (uint32_t)-1;
  Timeline         timeline;

  bool from_py8log(std::istream &);
  bool from_hepmc2(std::istream &);
  bool from_hepmc3(std::istream &);
  std::ostream &to_json(std::ostream &) const;
  std::ostream &to_js(std::ostream &) const;

private:
  std::string      input_type;
  std::string      time_stamp;
  Particles        particles;
  ParticleIndex    particle_index;
  uint32_t         central_phase = phase_undef;
  Particles        central_particles;
  uint32_t         central_status = (uint32_t)-1;

  bool load_py8log(std::istream &);
  bool load_hepmc2(std::istream &);
  bool load_hepmc3(std::istream &);
  bool process_all();

  template<class>
    bool load_hepmc(std::istream &);
  bool build_index();
  bool find_centrals();
  void build_timeline();
  bool calc_dynamics();
  void write_time_stamp();

  uint32_t get_birth(const ParticlePtr &) noexcept(false);
  uint32_t get_main_mother(Particle &);
};

}  // namespace Hepani
