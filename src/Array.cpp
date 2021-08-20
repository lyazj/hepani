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

#include "Array.h"

using namespace CTjson;
using namespace std;

namespace Hepani {

double &Array::operator[](size_t i)
{
  return data[i];
}
const double &Array::operator[](size_t i) const
{
  return data[i];
}

Array Array::operator+() const
{
  return *this;
}
Array Array::operator-() const
{
  return -1 * *this;
}

Array &Array::operator+=(const Array &other)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] += other.data[i];
  return *this;
}
Array &Array::operator-=(const Array &other)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] -= other.data[i];
  return *this;
}
Array &Array::operator*=(double d)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] *= d;
  return *this;
}
Array &Array::operator/=(double d)
{
  for(size_t i = 0; i < 3; ++i)
    data[i] /= d;
  return *this;
}

Array operator+(const Array &A, const Array &B)
{
  return Array(A) += B;
}
Array operator-(const Array &A, const Array &B)
{
  return Array(A) -= B;
}
Array operator*(const Array &A, double d)
{
  return Array(A) *= d;
}
Array operator*(double d, const Array &A)
{
  return Array(A) *= d;
}
Array operator/(const Array &A, double d)
{
  return Array(A) /= d;
}

ojsonstream &Array::print(ojsonstream &ojs) const
{
  return ojs << data;
}

}  // namespace Hepani
