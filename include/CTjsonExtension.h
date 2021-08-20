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

#include "CTjson.h"

#include <memory>

#include <stdint.h>

namespace CTjson {

template<>
inline ojsonstream &operator<<(ojsonstream &ojs, const uint32_t &t)
{
  ojs.base() << (int32_t)t;
  return ojs;
}

template<class T>
inline auto operator<<(ojsonstream &ojs, const std::shared_ptr<T> &t)
  -> decltype(ojs << *t)
{
  if(t == nullptr)
    return ojs << nullptr;
  return ojs << *t;
}

}  // namespace CTjson
