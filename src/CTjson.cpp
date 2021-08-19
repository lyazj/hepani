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

#include "CTjson.h"

namespace CTjson {

inline std::ostream &escape(ojsonstream &ojs, char c)
{
  if(c == '\"')
    return ojs.base() << "\\\"";
  if(c == '\\')
    return ojs.base() << "\\\\";
  if(isprint(c))
    return ojs.base() << c;
  if(c == '\n')
    return ojs.base() << "\\n";
  if(c == '\r')
    return ojs.base() << "\\r";
  if(c == '\t')
    return ojs.base() << "\\t";
  if(c == '\b')
    return ojs.base() << "\\b";
  if(c == '\f')
    return ojs.base() << "\\f";
  return ojs.base() << c;
}

ojsonstream &operator<<(ojsonstream &ojs, char c)
{
  ojs.base() << '\"';
  escape(ojs, c);
  ojs.base() << '\"';
  return ojs;
}

ojsonstream &operator<<(ojsonstream &ojs, const char *str)
{
  if(!str)
    return ojs << nullptr;
  ojs.base() << '\"';
  while(*str)
    escape(ojs, *str++);
  ojs.base() << '\"';
  return ojs;
}

ojsonstream &operator<<(ojsonstream &ojs, const std::string &str)
{
  ojs.base() << '\"';
  for(char c : str)
    escape(ojs, c);
  ojs.base() << '\"';
  return ojs;
}

}  // namespace CTjson
