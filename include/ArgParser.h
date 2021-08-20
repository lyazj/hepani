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

#include "System.h"

#include <sstream>

namespace Hepani {

class ArgParser {
public:
  ArgParser() = default;
  ArgParser(int argc, char *argv[]) { parse(argc, argv); }
  
  bool parse(int, char *[]);
  void reset();
  bool ready() { return _ready; }
  bool error() { return _error; }
  bool run(std::istream & = std::cin,
      std::ostream & = std::cout) noexcept(false);

private:
  bool _ready = false;
  bool _error = false;
  std::map<std::string, std::string> args;
  std::istringstream iss;
  System system;

  template<class T> T parse(std::string) noexcept(false);
};

template<class T>
T ArgParser::parse(std::string arg) noexcept(false)
{
  T t;
  iss.clear();
  iss.str(arg);
  if(iss >> t)
    return t;
  throw std::runtime_error("Invalid argument: " + std::string(arg) + ".");
}

extern template int ArgParser::parse(std::string);
extern template double ArgParser::parse(std::string);

}  // namespace Hepani
