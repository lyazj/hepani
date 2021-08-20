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

#include "Timeline.h"

#include <algorithm>
#include <stdexcept>

using namespace std;
using namespace CTjson;

namespace Hepani {

void Timeline::set_duration(uint32_t phase, double duration)
{
  raw[phase] = max(duration, duration_min);
}

void Timeline::reset_durations()
{
  raw.clear();
}

void Timeline::build(uint32_t max)
{
  built.clear();
  for(uint32_t i = 0; i < max; ++i)
  {
    auto iter(raw.find(i));
    if(iter == raw.end())
      built.push_back(duration_default);
    else
      built.push_back(iter->second);
  }
  for(uint32_t i = 1; i < max; ++i)
    built[i] += built[i - 1];
}

double Timeline::operator[](uint32_t phase) const
{
  if(phase == (uint32_t)-1)
    return 0.0;
  if(phase >= size())
    throw out_of_range(
        "Timeline built with max " + to_string(size()) +
        ", however accessed with index " + to_string(phase) + ".");
  return built[phase];
}

double Timeline::get_span(uint32_t p1, uint32_t p2) const
{
  return operator[](p1 - 1) - operator[](p2 - 1);
}

ojsonstream &Timeline::print(ojsonstream &_ojs) const
{
  ojsonstream ojs(_ojs.base().rdbuf());
  ojs.setspace(0);
  ojs.base() << fixed << setprecision(3);
  ojs << built;
  return _ojs;
}

}  // namespace Hepani
