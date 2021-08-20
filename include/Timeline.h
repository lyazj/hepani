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

#include "CTjsonExtension.h"

#include <map>
#include <vector>

namespace Hepani {

constexpr double duration_min = 0.001;
constexpr double duration_default = 1.0;

class Timeline {
public:
  void set_duration(uint32_t, double);
  void reset_durations();
  void build(uint32_t);
  uint32_t size() const { return built.size(); }
  double operator[](uint32_t) const;
  double get_span(uint32_t, uint32_t) const;
  CTjson::ojsonstream &print(CTjson::ojsonstream &) const;

private:
  std::map<uint32_t, double> raw;
  std::vector<double> built;
};

}  // namespace Hepani
