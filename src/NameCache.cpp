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

#include "NameCache.h"

#include <fstream>

using namespace std;

NameCache::NameCache(istream &is)
{
  int pid;
  char buf;
  string name;
  while(is >> pid && is >> buf)
  {
    if(buf != ':')
    {
      is.setstate(is.failbit);
      break;
    }
    if(!getline(is, name))
      break;
    data[pid] = name;
  }
}

NameCache::NameCache(const string &filename)
{
  ifstream ifs(filename);
  NameCache nc(ifs);
  if(ifs.eof())
    operator=(nc);
}

string *NameCache::find(int pid)
{
  auto iter(data.find(pid));
  if(iter == data.end())
    return nullptr;
  return &iter->second;
}

NameCache name_cache("cache/name.txt");
