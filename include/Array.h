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

namespace Hepani {

struct Array {
  double data[3];

  double &operator[](size_t);
  const double &operator[](size_t) const;

  Array operator+() const;
  Array operator-() const;
  Array &operator+=(const Array &);
  Array &operator-=(const Array &);
  Array &operator*=(double);
  Array &operator/=(double);

  CTjson::ojsonstream &print(CTjson::ojsonstream &) const;
};

Array operator+(const Array &, const Array &);
Array operator-(const Array &, const Array &);
Array operator*(const Array &, double);
Array operator*(double, const Array &);
Array operator/(const Array &, double);

}  // namespace Hepani
