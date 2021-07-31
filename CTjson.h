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

#include <stddef.h>
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <utility>

namespace CTjson {

class ojsonstream : protected std::ostream {
public:
  typedef size_t depth_type;

  ojsonstream(std::basic_streambuf<char> *psb)
    : std::ostream(psb),
    _depth(0), _ind_char(' '), _ind_cnt(4)
  {
    base() << std::boolalpha;
    base() << std::fixed << std::setprecision(6);
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
  ojsonstream &indent()
  {
    base() << std::string(_depth * _ind_cnt, _ind_char);
    return *this;
  }

private:
  depth_type  _depth;
  char        _ind_char;
  size_t      _ind_cnt;
};

typedef ojsonstream &iomanip(ojsonstream &);

inline ojsonstream &operator<<(ojsonstream &ojs, iomanip &iom)
{
  return iom(ojs);
}

// for performance, no explicit flushing
inline ojsonstream &endl(ojsonstream &ojs)
{
  ojs.base() << '\n';
  return ojs.indent();
}

// more iomanips to be added...

inline ojsonstream &operator<<(ojsonstream &ojs, nullptr_t)
{
  ojs.base() << "null";
  return ojs;
}

inline ojsonstream &operator<<(ojsonstream &ojs, const std::string &str)
{
  ojs.base() << "\"";
  for(char c : str)
  {
    if(isprint(c))
    {
      if(c == '\"') ojs.base() << "\\\"";
      // else if(c == '\'') ojs.base() << "\\\'";
      else if(c == '\\') ojs.base() << "\\\\";
      else ojs.base() << (c);
    }
    else if(c == '\n') ojs.base() << "\\n";
    else if(c == '\r') ojs.base() << "\\r";
    else if(c == '\t') ojs.base() << "\\t";
    // else if(c == '\v') ojs.base() << "\\v";
    // else if(c == '\0') ojs.base() << "\\0";
    // else if(c == '\a') ojs.base() << "\\a";
    else if(c == '\b') ojs.base() << "\\b";
    else if(c == '\f') ojs.base() << "\\f";
    else
    {
      ojs.base() << "\\x" << std::hex << (unsigned)c << std::dec;
    }
  }
  ojs.base() << "\"";
  return ojs;
}

inline ojsonstream &operator<<(ojsonstream &ojs, const char *str)
{
  if(!str)
    return ojs << nullptr;

  return ojs << std::string(str);
}

template<class T>
inline auto operator<<(ojsonstream &ojs, const T &t)
  -> typename
  std::enable_if<std::is_arithmetic<T>::value, ojsonstream &>::type
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
    ojs.base() << ", ";
    ojs << *it_beg++;
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
  ojs.base() << ": ";
  ojs << value;
  return ojs;
}

template<class T>
auto operator<<(ojsonstream &ojs, const T &t)
  -> decltype(prt_pair(ojs, std::begin(t)->first, std::begin(t)->second))
{
  ojs.base() << '{';
  ojs.enter() << endl;

  auto it_beg(std::begin(t)), it_end(std::end(t));
  if(it_beg != it_end)
  {
    prt_pair(ojs, it_beg->first, it_beg->second);
    ++it_beg;
  }
  while(it_beg != it_end)
  {
    ojs.base() << ',';
    ojs << endl;
    prt_pair(ojs, it_beg->first, it_beg->second);
    ++it_beg;
  }

  ojs.leave() << endl;
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
  ojs << endl;
  return prt_pair(ojs, std::forward<Args>(args)...);
}

template<class... Args>
inline auto prt_obj(ojsonstream &ojs, Args &&...args)
  -> decltype(prt_pair(ojs, std::forward<Args>(args)...))
{
  ojs.base() << '{';
  ojs.enter() << endl;

  prt_pair(ojs, std::forward<Args>(args)...);

  ojs.leave() << endl;
  ojs.base() << '}';

  return ojs;
}

}  // namespace CTjson
