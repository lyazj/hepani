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

#ifndef HEPANI_HDR
#define HEPANI_HDR

#include "CTjson.h"

#include <stddef.h>
#include <stdint.h>
#include <string>
#include <vector>
#include <set>
#include <iostream>

namespace CTjson {

template<>
inline ojsonstream &operator<<(ojsonstream &ojs, const uint32_t &t)
{
  ojs.base() << (int32_t)t;
  return ojs;
}

template<class T>
inline auto operator<<(ojsonstream &ojs, const T &t)
  -> decltype(t.print(ojs))
{
  return t.print(ojs);
}

}  // namespace CTjson

using namespace CTjson;

#define KVP(var) #var, var

struct Array {
  double  data[3];

  double &operator[](size_t);
  const double &operator[](size_t) const;

  Array operator+() const;
  Array operator-() const;
  Array &operator+=(const Array &);
  Array &operator-=(const Array &);
  Array &operator*=(double);
  Array &operator/=(double);

  ojsonstream &print(ojsonstream &) const;
};

Array operator+(const Array &, const Array &);
Array operator-(const Array &, const Array &);
Array operator*(const Array &, double);
Array operator*(double, const Array &);
Array operator/(const Array &, double);

constexpr uint32_t phase_undef = (uint32_t)-1;

struct Particle {
  uint32_t            no;          // Assigned while loading
  int32_t             id;          // Assigned while loading
  std::string         name;        // Assigned while loading
  uint32_t            colours[2];  // Assigned while loading
  Array               r;           // Caculated uniformly
  Array               v;           // Assigned to p / e while loading
  Array               p;           // Assigned while loading
  double              e;           // Assigned while loading
  double              m;           // Assigned while loading
  uint32_t            birth;       // Assigned to -1 while loading...
  uint32_t            death;       // Assigned to -1 while loading...
  std::set<uint32_t>  momset;      // Assigned while loading
  std::set<uint32_t>  dauset;      // Assigned while loading

  ojsonstream &print(ojsonstream &) const;
};

struct Parpy8log : Particle {
  int32_t   status;                // Assigned while loading
  uint32_t  mothers[2];            // Assigned while loading
  uint32_t  daughters[2];          // Assigned while loading
};

std::istream &operator>>(std::istream &, Parpy8log &);

typedef std::vector<std::vector<Particle>> Particles;
typedef std::vector<std::vector<uint32_t>> Parindex;
typedef std::vector<Parpy8log> Parpy8logs;

struct System {
  Particles   particles;   // Changed only if caculating success
  Parindex    parindex;    // Changed only if caculating success
  Parpy8logs  parpy8logs;  // Changed only if caculating success

  bool from_py8log(std::istream &);
  bool to_json(std::ostream &) const;
};

#endif  /* HEPANI_HDR */
