#include "HepMC2Extension.h"
#include "Hepani.h"

#include <HepMC3/Print.h>

using namespace std;
using namespace HepMC3;

int main()
{
  HepMC2RandomAccessor h2ra("input.hepmc");
  GenEvent evt;
  h2ra.read_event(evt);
  Print::content(evt);

  vector<Particle> particles;

  for(GenParticlePtr pparticle : evt.particles())
  {
    Particle particle;

    particle.no = pparticle->id();
    particle.id = pparticle->pid();
    // string name;
    // uint32_t colours[2];
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

  cout << particles.size() << endl;
}
