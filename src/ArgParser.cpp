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

#include "ArgParser.h"

using namespace std;

namespace Hepani {

template int ArgParser::parse(std::string);
template double ArgParser::parse(std::string);

bool ArgParser::parse(int argc, char *argv[])
{
  args.clear();
  if(_error)
    system = System();

  for(int i = 1; i < argc; ++i)
  {
    string key(argv[i]);
    // if(key.substr(0, 1) == "-")
    // {
    //
    // }
    if(key.substr(0, 2) != "--")
    {
      cerr << "Invalid option key: " + key << "." << endl;
      return _ready = !(_error = true);
    }
    key = key.substr(2);
    // ...
    if(i == argc)
    {
      cerr << "Missing value of option: " + key << "." << endl;
      return _ready = !(_error = true);
    }
    string val(argv[++i]);
    if(key.substr(0, 1) == "d")
    {
      try {
        system.timeline.set_duration(
            parse<int>(key.substr(1)), parse<double>(val));
      }
      catch(const runtime_error &err) {
        cerr << err.what() << endl;
        return _ready = !(_error = true);
      }
    }
    if(key == "event")
    {
      if(val != "notset")
      {
        try {
          system.event_index = parse<uint32_t>(val);
        }
        catch(const runtime_error &err) {
          cerr << err.what() << endl;
          return _ready = !(_error = true);
        }
      }
    }
    // else if(...)
    // {

    // }
    else
      args[move(key)].assign(move(val));
  }
  return _ready = !(_error = false);
}

void ArgParser::reset()
{
  args.clear();
  system = System();
  _ready = _error = false;
}

bool ArgParser::run(istream &is, ostream &os) noexcept(false)
{
  if(_error)
    throw runtime_error("Running program with argument parsing error.");
  if(!_ready)
    throw runtime_error("Running program without argument parsing.");

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wshadow"
  map<string, string> args;
  System system;
  swap(args, this->args);
  swap(system, this->system);
  _ready = false;
#pragma GCC diagnostic pop

  if(args["type"] == "py8log")
    return system.from_py8log(is) && system.to_json(os);
  if(args["type"] == "hepmc2")
    return system.from_hepmc2(is) && system.to_json(os);
  // if(...)
  // {

  // }
  cerr << "Unsupported file type." << endl;
  return false;
}

}  // namespace Hepani
