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

#include "Hepani.h"

#include <map>
#include <sstream>
#include <fstream>
#include <iomanip>
#include <iterator>
#include <limits>
#include <stdexcept>
#include <algorithm>
#include <type_traits>

using namespace std;

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

// static inline istream &pass(istream &is, char c)
// {
//   return is.ignore(numeric_limits<streamsize>::max(), c);
// }
// 
// istream &operator>>(istream &is, Array &arr)
// {
//   pass(is, '[') >> arr[0];
//   for(size_t i = 1; i < 3; ++i)
//     pass(is, ',') >> arr[i];
//   return pass(is, ']');
// }

ojsonstream &Array::print(ojsonstream &ojs) const
{
  return ojs << data;
}

inline static void general_loading_assign(Particle &particle)
{
  particle.v = particle.p / particle.e;
  particle.birth = particle.death = phase_undef;
}

istream &operator>>(istream &is, Parpy8log &parpy8log)
{
  is >> parpy8log.no >> parpy8log.id;
  is >> parpy8log.name >> parpy8log.status;
  is >> parpy8log.mothers[0] >> parpy8log.mothers[1];
  is >> parpy8log.daughters[0] >> parpy8log.daughters[1];
  is >> parpy8log.colours[0] >> parpy8log.colours[1];
  is >> parpy8log.p[0] >> parpy8log.p[1] >> parpy8log.p[2];
  is >> parpy8log.e >> parpy8log.m;

  general_loading_assign(parpy8log);

  return is;
}

template<class T>
static auto get_birth(uint32_t i, T &pars) ->
  typename enable_if<is_base_of<Particle,
  typename remove_reference<decltype(pars[0])>::type
  >::value, uint32_t>::type
{
  if(pars[i].birth == phase_undef)
  {
    static unsigned depth = 0;
    if(depth >= pars.size())
      throw runtime_error("maximum recursive depth exceeded");
    ++depth;

    pars[i].birth = 0;
    for(uint32_t m : pars[i].momset)
      pars[i].birth = max(pars[i].birth, get_birth(m, pars) + 1);

    --depth;
  }
  return pars[i].birth;
}

/* parindex and pars undefined if false returned */
template<class T>
static auto general_process(
    Particles &particles, Parindex &parindex, T &pars) ->
  typename enable_if<is_base_of<Particle,
  typename remove_reference<decltype(pars[0])>::type
  >::value, bool>::type
{
  /* build index */
  parindex.clear();
  try {
    for(uint32_t i = 0; i < pars.size(); ++i)
    {
      uint32_t birth(get_birth(i, pars));
      if(parindex.size() < birth + 1)
        parindex.resize(birth + 1);
      parindex[birth].push_back(i);
    }
  }
  catch(const runtime_error &) {
    return false;
  }

  /* do general calculation orderly */
  for(uint32_t p = 0; p < parindex.size(); ++p)
    for(uint32_t i : parindex[p])
    {
      double e_sum = 0.0;
      pars[i].r = {0.0};
      for(uint32_t m : pars[i].momset)
      {
        e_sum += pars[m].e;
        pars[i].r += pars[m].e * (
            pars[m].r + pars[m].v * (p - pars[m].birth) * 1.0);
        pars[m].death = min(pars[m].death, p);
      }
      if(e_sum)
        pars[i].r /= e_sum;
    }

  /* make result copy */
  particles.clear();
  particles.resize(parindex.size());
  for(uint32_t i = 0; i < parindex.size(); ++i)
    for(uint32_t j = 0; j < parindex[i].size(); ++j)
      for(uint32_t p = i;
          p < pars[parindex[i][j]].death && p < parindex.size(); ++p)
      {
        particles[p].push_back(pars[parindex[i][j]]);
        particles[p].back().r += particles[p].back().v * (
            (p - particles[p].back().birth) * 1.0);
      }

  return true;
}

/* parpy8logs undefined if false returned */
static bool load_py8log(Parpy8logs &parpy8logs, const string &log)
{
  size_t start(log.find("PYTHIA Event Listing  (complete event)"));
  if(start == log.npos)
    return false;
  start = log.find("no", start);
  if(start == log.npos)
    return false;
  start = log.find("\n", start);
  if(start == log.npos)
    return false;

  size_t finish(log.find("End PYTHIA Event Listing", start));
  if(finish == log.npos)
    return false;
  finish = log.rfind("sum", finish);
  if(finish == log.npos)
    return false;
  finish = log.rfind("\n", finish);
  if(start == log.npos)
    return false;

  if(start > finish)
    return false;
  istringstream iss(log.substr(start, finish - start));
  istream_iterator<Parpy8log> it_beg(iss), it_end;
  parpy8logs.assign(it_beg, it_end);
  if(!iss.eof())                      // Check completeness
    return false;

  uint32_t idx(0);
  for(Parpy8log &parpy8log : parpy8logs)
  {
    if(parpy8log.no != idx)           // Check element orders
      return false;

    for(uint32_t m : parpy8log.mothers)  // Build hierachy
      if(m >= parpy8logs.size())         // Check indices
        return false;
      else if(m)                         // 0 can be a placeholder...
      {
        parpy8log.momset.insert(m);
        parpy8logs[m].dauset.insert(idx);
      }
    if(parpy8log.momset.empty() && idx)  // ...or a real mother...
    {
      parpy8log.momset.insert(0);
      parpy8logs[0].dauset.insert(idx);
    }

    for(uint32_t d : parpy8log.daughters)
      if(d >= parpy8logs.size())
        return false;
      else if(d)                         // ...but not a daughter
      {
        parpy8log.dauset.insert(d);
        parpy8logs[d].momset.insert(idx);
      }

    ++idx;
  }

  return true;
}

bool System::from_py8log(istream &is)
{
  ostringstream oss;
  oss << is.rdbuf();
  string log(oss.str());

  Parpy8logs parpy8tmps;
  if(!load_py8log(parpy8tmps, log))
    return false;

  Particles partitmps;
  Parindex paridxtmp;
  if(!general_process(partitmps, paridxtmp, parpy8tmps))
    return false;

  swap(particles, partitmps);
  swap(parindex, paridxtmp);
  swap(parpy8logs, parpy8tmps);
  return true;
}

ojsonstream &Particle::print(ojsonstream &ojs) const
{
  return prt_obj(
      ojs,
      KVP(no),
      KVP(id),
      KVP(name),
      KVP(colours),
      KVP(r),
      KVP(v),
      KVP(e),
      KVP(m),
      KVP(birth),
      KVP(death),
      KVP(momset),
      KVP(dauset)
  );
}

bool System::to_json(std::ostream &os) const
{
  ojsonstream ojs(os.rdbuf());
  ojs.base() << scientific << setprecision(3);
  return (bool)(ojs << particles);
}

int main(int argc, char *argv[])
{
  map<string, string> args;
  for(int i = 1; i < argc; ++i)
  {
    string key(argv[i]);
    if(key.size() < 3 || key.substr(0, 2) != "--")
    {
      cerr << "Invalid argument: " + key << "." << endl;
      return 1;
    }
    key = key.substr(2);
    if(i == argc)
    {
      cerr << "Missing value of option: " << key << "." << endl;
      return 1;
    }
    args[key] = argv[++i];
  }

  ifstream ifs("input.txt");
  if(!ifs)
  {
    cerr << "Cannot open input file." << endl;
    return 1;
  }

  System system;

  if(args["type"] == "py8log")
  {
    if(!system.from_py8log(ifs))
    {
      cerr << "Invalid input file." << endl;
      return 1;
    }
  }
  else
  {
    cerr << "Unsupported file type." << endl;
    return 1;
  }

  if(!system.to_json(cout))
  {
    cerr << "Error writing output." << endl;
    return 1;
  }

  // ojsonstream ojs(clog.rdbuf());
  // ojs << args << endl;

  return 0;
}
