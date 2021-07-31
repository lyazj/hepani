#include "HepMC2Extension.h"
#include "Hepani.h"

// #include <HepMC3/Print.h>

using namespace std;
using namespace HepMC3;

int main()
{
  HepMC2RandomAccessor h2ra("input.hepmc");
  GenEvent evt;
  h2ra.read_event(0, evt);
  // Print::content(evt);

  vector<Particle> particles;

  for(GenParticlePtr pparticle : evt.particles())
  {
    Particle particle;

    particle.no = pparticle->id();
    particle.id = pparticle->pid();
    // string name;

    unsigned int attribute_state(0);
    for(const string &name : pparticle->attribute_names())
    {
      if(name == "flow1")
      {
        particle.colours[0] =
          pparticle->attribute<IntAttribute>("flow1")->value();
        attribute_state |= 1U << 0;
      }
      else if(name == "flow2")
      {
        particle.colours[1] =
          pparticle->attribute<IntAttribute>("flow2")->value();
        attribute_state |= 1U << 1;
      }
      if(attribute_state == ~(~0U << 2))
        break;
    }
    for(int i = 0; i < 2; ++i)
      if(!(attribute_state & (1U << i)))
        particle.colours[i] = 0;

    const FourVector &momentum(pparticle->momentum());
    particle.p = {momentum.px(), momentum.py(), momentum.pz()};
    particle.e = momentum.e();
    particle.m = pparticle->generated_mass();

    for(GenParticlePtr pparent : pparticle->parents())
      particle.momset.insert(pparent->id());
    for(GenParticlePtr pchild : pparticle->children())
      particle.dauset.insert(pchild->id());

    particles.emplace_back(move(particle));
  }

  for(const Particle &particle : particles)
    cout << particle.colours[0] << " " << particle.colours[1] << endl;
  cout << particles.size() << endl;
}
