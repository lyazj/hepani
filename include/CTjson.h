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

#include <math.h>
#include <stddef.h>
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <utility>

#define KVP(var) #var, var

namespace CTjson {

class ojsonstream : protected std::ostream {
public:
  typedef size_t depth_type;

  ojsonstream(std::basic_streambuf<char> *psb)
    : std::ostream(psb),
    _depth(0), _ind_char(' '), _ind_cnt(4),
    _breakline(true), _space(true)
  {
    base() << std::boolalpha << std::scientific;
  }

  std::ostream &base()
  {
    return *this;
  }
  const std::ostream &base() const
  {
    return *this;
  }

  explicit operator bool() const
  {
    return (bool)base();
  }

  // for other methods, take base().eof() for example

  depth_type depth() const
  {
    return _depth;
  }
  ojsonstream &enter()
  {
    if(_depth == (depth_type)-1)
      throw std::out_of_range("depth overflow");
    ++_depth;
    return *this;
  }
  ojsonstream &leave()
  {
    if(_depth == 0)
      throw std::out_of_range("depth underflow");
    --_depth;
    return *this;
  }

  ojsonstream &setindent(char c, size_t cnt = (size_t)-1)
  {
    _ind_char = c;
    _ind_cnt = cnt != (size_t)-1 ? cnt
      : c == ' ' ? 4
      : c == '\t' ? 1
      : 0;
    return *this;
  }
  ojsonstream &setbreakline(bool b)
  {
    _breakline = b;
    return *this;
  }
  ojsonstream &breakline()
  {
    if(_breakline)
    {
      base() << '\n';
      indent();
    }
    return *this;
  }
  ojsonstream &setspace(bool b)
  {
    _space = b;
    return *this;
  }
  ojsonstream &space()
  {
    if(_space)
      base() << ' ';
    return *this;
  }

private:
  depth_type  _depth;
  char        _ind_char;
  size_t      _ind_cnt;
  bool        _breakline;
  bool        _space;

  ojsonstream &indent()
  {
    size_t num(_depth * _ind_cnt);
    for(depth_type i = 0; i < num; ++i)
      base() << _ind_char;
    return *this;
  }
};

inline ojsonstream &operator<<(
    ojsonstream &ojs, std::ostream &(*manip)(std::ostream &))
{
  manip(ojs.base());
  return ojs;
}

inline ojsonstream &operator<<(ojsonstream &ojs, nullptr_t)
{
  ojs.base() << "null";
  return ojs;
}

ojsonstream &operator<<(ojsonstream &, char);
ojsonstream &operator<<(ojsonstream &, const char *);
ojsonstream &operator<<(ojsonstream &, const std::string &);

template<class T>
inline auto operator<<(ojsonstream &ojs, const T &t)
  -> typename std::enable_if<
  std::is_floating_point<T>::value,
  ojsonstream &>::type
{
  if(isnan(t) || isinf(t))
    return ojs << nullptr;
  ojs.base() << t;
  return ojs;
}

template<class T>
inline auto operator<<(ojsonstream &ojs, const T &t)
  -> typename std::enable_if<
  std::is_integral<T>::value,
  ojsonstream &>::type
{
  ojs.base() << t;
  return ojs;
}

template<class T>
auto operator<<(ojsonstream &ojs, const T &t)
  -> decltype(ojs << *std::begin(t))
{
  ojs.base() << '[';

  auto it_beg(std::begin(t)), it_end(std::end(t));
  if(it_beg != it_end)
    ojs << *it_beg++;
  while(it_beg != it_end)
  {
    ojs.base() << ',';
    ojs.space() << *it_beg++;
  }

  ojs.base() << ']';

  return ojs;
}

template<class T>
inline auto prt_pair(ojsonstream &ojs,
    const std::string &key, const T &value)
  -> decltype(ojs << value)
{
  ojs << key;
  ojs.base() << ':';
  ojs.space() << value;
  return ojs;
}

template<class T>
auto operator<<(ojsonstream &ojs, const T &t)
  -> decltype(prt_pair(ojs, std::begin(t)->first, std::begin(t)->second))
{
  ojs.base() << '{';
  ojs.enter().breakline();

  auto it_beg(std::begin(t)), it_end(std::end(t));
  if(it_beg != it_end)
  {
    prt_pair(ojs, it_beg->first, it_beg->second);
    ++it_beg;
  }
  while(it_beg != it_end)
  {
    ojs.base() << ',';
    ojs.breakline();
    prt_pair(ojs, it_beg->first, it_beg->second);
    ++it_beg;
  }

  ojs.leave().breakline();
  ojs.base() << '}';

  return ojs;
}

template<class T, class... Args>
inline auto prt_pair(ojsonstream &ojs,
    const std::string &key, const T &value, Args &&...args)
  -> decltype(ojs << value)
{
  prt_pair(ojs, key, value);
  ojs.base() << ',';
  ojs.breakline();
  return prt_pair(ojs, std::forward<Args>(args)...);
}

template<class... Args>
inline auto prt_obj(ojsonstream &ojs, Args &&...args)
  -> decltype(prt_pair(ojs, std::forward<Args>(args)...))
{
  ojs.base() << '{';
  ojs.enter().breakline();

  prt_pair(ojs, std::forward<Args>(args)...);

  ojs.leave().breakline();
  ojs.base() << '}';

  return ojs;
}

template<class T>
inline auto operator<<(ojsonstream &ojs, const T &t)
  -> decltype(t.print(ojs))
{
  return t.print(ojs);
}

}  // namespace CTjson
