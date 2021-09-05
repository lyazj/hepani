"use strict"

// @REF: Monte Carlo Particle Numbering Scheme

var PID = {

  abs: Math.abs,

  isQuark: (pid) => {
    pid = PID.abs(pid)
    return pid >= 1 && pid <= 8
  },

  isLepton: (pid) => {
    pid = PID.abs(pid)
    return pid >= 11 && pid <= 18
  },

  isGHB: (pid) => {  // Gauge and Higgs Bosons
    pid = PID.abs(pid)
    return pid >= 21 && pid <= 25
      || pid >= 32 && pid <= 37
  },

  isSpecial: (pid) => {
    return [39, 41, 42, 110, 990, 9990].indexOf(PID.abs(pid)) > -1
  },

  isMC: (pid) => {
    pid = PID.abs(pid)
    return pid >= 81 && pid <= 100
  },

  isDiquark: (pid) => {
    return [
      1103, 2101, 2103, 2203, 3101,
      3103, 3201, 3203, 3303, 4101,
      4103, 4201, 4203, 4301, 4303,
      4403, 5101, 5103, 5201, 5203,
      5301, 5303, 5401, 5403, 5503,
    ].indexOf(PID.abs(pid)) > -1
  },

  isSUSY: (pid) => {
    return [
      1000001, 1000002, 1000003, 1000004, 1000005,
      1000006, 1000011, 1000012, 1000013, 1000014,
      1000015, 1000016, 2000001, 2000002, 2000003,
      2000004, 2000005, 2000006, 2000011, 2000013,
      2000015, 1000021, 1000022, 1000023, 1000024,
      1000025, 1000035, 1000037, 1000039,
    ].indexOf(PID.abs(pid)) > -1
  },

  isLightI1Meson: (pid) => {
    return [
      111, 211, 9000111, 9000211, 100111,
      100211, 10111, 10211, 9010111, 9010211,
      113, 213, 10113, 10213, 20113,
      20213, 9000113, 9000213, 100113, 100213,
      9010113, 9010213, 9020113, 9020213, 30113,
      30213, 9030113, 9030213, 9040113, 9040213,
      115, 215, 10115, 10215, 9000115,
      9000215, 9010115, 9010215, 117, 217,
      9000117, 9000217, 9010117, 9010217,
      119, 219,
    ].indexOf(PID.abs(pid)) > -1
  },

  isLightI0Meson: (pid) => {
    return [
      221, 331, 9000221, 9010221, 100221,
      10221, 9020221, 100331, 9030221, 10331,
      9040221, 9050221, 9060221, 9070221, 9080221,
      223, 333, 10223, 20223, 10333,
      20333, 100223, 9000223, 9010223, 30223,
      100333, 225, 9000225, 335, 9010225,
      9020225, 10225, 9030225, 10335, 9040225,
      9050225, 9060225, 9070225, 9080225, 9090225,
      227, 337, 229, 9000229, 9010229,
    ].indexOf(PID.abs(pid)) > -1
  },

  isStrangeMeson: (pid) => {
    return [
      130, 310, 311, 321, 9000311,
      9000321, 10311, 10321, 100311, 100321,
      9010311, 9010321, 9020311, 9020321, 313,
      323, 10313, 10323, 20313, 20323,
      100313, 100323, 9000313, 9000323, 30313,
      30323, 315, 325, 9000315, 9000325,
      10315, 10325, 20315, 20325, 9010315,
      9010325, 9020315, 9020325, 317, 327,
      9010317, 9010327, 319, 329, 9000319,
      9000329,
    ].indexOf(PID.abs(pid)) > -1
  },

  isCharmedMeson: (pid) => {
    return [
      411, 421, 10411, 10421, 413,
      423, 10413, 10423, 20413, 20423,
      415, 425, 431, 10431, 433,
      10433, 20433, 435,
    ].indexOf(PID.abs(pid)) > -1
  },

  isBottomMeson: (pid) => {
    return [
      511, 521, 10511, 10521, 513,
      523, 10513, 10523, 20513, 20523,
      515, 525, 531, 10531, 533,
      10533, 20533, 535, 541, 10541,
      543, 10543, 20543, 545,
    ].indexOf(PID.abs(pid)) > -1
  },

  isCcbarMeson: (pid) => {
    return [
      441, 10441, 100441, 443, 10443,
      20443, 100443, 30443, 9000443, 9010443,
      9020443, 445, 100445,
    ].indexOf(PID.abs(pid)) > -1
  },

  isBbbarMeson: (pid) => {
    return [
      551, 10551, 100551, 110551, 200551,
      210551, 553, 10553, 20553, 30553,
      100553, 110553, 120553, 130553, 200553,
      210553, 220553, 300553, 9000553, 9010553,
      555, 10555, 20555, 100555, 110555,
      120555, 200555, 557, 100557,
    ].indexOf(PID.abs(pid)) > -1
  },

  isLightBaryon: (pid) => {
    return [
      2212, 2112, 2224, 2214, 2114, 1114
    ].indexOf(PID.abs(pid)) > -1
  },

  isStrangeBaryon: (pid) => {
    return [
      3122, 3222, 3212, 3112, 3224,
      3214, 3114, 3322, 3312, 3324,
      3314, 3334,
    ].indexOf(PID.abs(pid)) > -1
  },

  isCharmedBaryon: (pid) => {
    return [
      4122, 4222, 4212, 4112, 4224,
      4214, 4114, 4232, 4132, 4322,
      4312, 4324, 4314, 4332, 4334,
      4412, 4422, 4414, 4424, 4432,
      4434, 4444,
    ].indexOf(PID.abs(pid)) > -1
  },

  isBottomBaryon: (pid) => {
    return [
      5122, 5112, 5212, 5222, 5114,
      5214, 5224, 5132, 5232, 5312,
      5322, 5314, 5324, 5332, 5334,
      5142, 5242, 5412, 5422, 5414,
      5424, 5342, 5432, 5434, 5442,
      5444, 5512, 5522, 5514, 5524,
      5532, 5534, 5542, 5544, 5554,
    ].indexOf(PID.abs(pid)) > -1
  },

  getPIDMatch: (particleData) => {
    if(particleData.pidMatch === undefined)
    {
      particleData.pidMatch = null
      for(var func in PID.colors)
        if(PID[func](particleData.id))
          particleData.pidMatch = func
    }
    return particleData.pidMatch
  },

  getColor: (particleData) => {
    var pidMatch = PID.getPIDMatch(particleData)
    if(!pidMatch)
      return 0xffffff
    return PID.colors[pidMatch]
  },

  getSize: (particleData) => {
    var pidMatch = PID.getPIDMatch(particleData)
    if(!pidMatch)
      return particleRadius
    return PID.sizes[pidMatch]
  },

  setColorScheme: (scheme) => {
    PID.colors = JSON.parse(PID.colorSchemes[PID.colorScheme = scheme])
  },

  setSizeScheme: (scheme) => {
    PID.sizes = JSON.parse(PID.sizeSchemes[PID.sizeScheme = scheme])
  },

  resetColor: () => {
    PID.setColorScheme(PID.colorScheme)
  },

  resetSize: () => {
    PID.setSizeScheme(PID.sizeScheme)
  },

}

// @REF: pythia8305/include/Pythia8Plugins/Visualisation.h
// @REF: https://pythia.org/manuals/pythia8306/ParticleProperties.html

var STATUS = {

  abs: Math.abs,

  isNull: (status) => {  // meaningless
    status = STATUS.abs(status)
    return status == 0
  },

  isFinal: (status) => {  // not decayed yet
    status = STATUS.abs(status)
    return status == 1
  },

  isDecayed: (status) => {  // SM-hadron, tau, mu
    status = STATUS.abs(status)
    return status == 2
  },

  // isDocEntry: (status) => {  // not used
  //   status = STATUS.abs(status)
  //   return status == 3
  // },

  isBeam: (status) => {
    status = STATUS.abs(status)
    return status == 4 || status > 10 && status < 20
  },

  isHard: (status) => {
    status = STATUS.abs(status)
    return status > 20 && status < 30
  },

  isMPI: (status) => {  // from multiparton interactions
    status = STATUS.abs(status)
    return status > 30 && status < 40
  },

  isISR: (status) => {  // from initial-state-showers
    status = STATUS.abs(status)
    return status > 40 && status < 50
  },

  isFSR: (status) => {  // from final-state-showers
    status = STATUS.abs(status)
    return status > 50 && status < 60
  },

  isRemnant: (status) => {
    status = STATUS.abs(status)
    return status > 60 && status < 70
  },

  isHadronPrep: (status) => {  // in preparation of hadronization
    status = STATUS.abs(status)
    return status > 70 && status < 80
  },

  isHadron: (status) => {  // primary from hadronization
    status = STATUS.abs(status)
    return status > 80 && status < 90
  },

  isDecay: (status) => {  // or from Bose-Einstein effects
    status = STATUS.abs(status)
    return status > 90 && status < 100
  },

  shouldInherit: (statusMatch) => {
    return ["isHard"].indexOf(statusMatch) > -1
  },

  getStatusMatch: (particleData) => {
    if(particleData.statusMatch === undefined)
    {
      particleData.statusMatch = null
      if(statusInherit)
      {
        var id = STATUS.abs(particleData.id)
        for(let i = 0; i < particleData.momset.length; ++i)
        {
          var mom = particleDatas[particleData.momset[i]]
          if(STATUS.abs(mom.id) == id)
          {
            var statusMatch = STATUS.getStatusMatch(mom)
            if(STATUS.shouldInherit(statusMatch))
            {
              particleData.statusMatch = statusMatch
              break
            }
          }
        }
      }
      if(!particleData.statusMatch)
        for(var func in STATUS.colors)
          if(STATUS[func](particleData.status))
            particleData.statusMatch = func
    }
    return particleData.statusMatch
  },

  getColor: (particleData) => {
    var statusMatch = STATUS.getStatusMatch(particleData)
    if(!statusMatch)
      return 0xffffff
    return STATUS.colors[statusMatch]
  },

  getSize: (particleData) => {
    var statusMatch = STATUS.getStatusMatch(particleData)
    if(!statusMatch)
      return particleRadius
    return STATUS.sizes[statusMatch]
  },

  enableInterit: () => {
    statusInherit = true
    STATUS.clearCache()
  },

  disableInterit: () => {
    statusInherit = false
    STATUS.clearCache()
  },

  clearCache: () => {
    particleDatas.forEach((particleData) => {
      delete particleData.statusMatch
    })
  },

  setColorScheme: (scheme) => {
    STATUS.colors = JSON.parse(STATUS.colorSchemes[STATUS.colorScheme = scheme])
  },

  setSizeScheme: (scheme) => {
    STATUS.sizes = JSON.parse(STATUS.sizeSchemes[STATUS.sizeScheme = scheme])
  },

  resetColor: () => {
    STATUS.setColorScheme(STATUS.colorScheme)
  },

  resetSize: () => {
    STATUS.setSizeScheme(STATUS.sizeScheme)
  },

}

PID.colorSchemes = {

  default: JSON.stringify({
    isQuark         : 0x0000ff,
    isLepton        : 0x00ff00,
    isGHB           : 0xff0000,
    isSpecial       : 0x000000,
    isMC            : 0x000000,
    isDiquark       : 0x00ffff,
    isSUSY          : 0x7f7f7f,
    isLightI1Meson  : 0xff00ff,
    isLightI0Meson  : 0xff00ff,
    isStrangeMeson  : 0xff00ff,
    isCharmedMeson  : 0xff00ff,
    isBottomMeson   : 0xff00ff,
    isCcbarMeson    : 0xff00ff,
    isBbbarMeson    : 0xff00ff,
    isLightBaryon   : 0xffff00,
    isStrangeBaryon : 0xffff00,
    isCharmedBaryon : 0xffff00,
    isBottomBaryon  : 0xffff00,
  }),

  // ...

}

PID.setColorScheme("default")

PID.sizeSchemes = {

  default: JSON.stringify({
    isQuark         : particleRadius,
    isLepton        : particleRadius,
    isGHB           : particleRadius,
    isSpecial       : particleRadius,
    isMC            : particleRadius,
    isDiquark       : particleRadius,
    isSUSY          : particleRadius,
    isLightI1Meson  : particleRadius,
    isLightI0Meson  : particleRadius,
    isStrangeMeson  : particleRadius,
    isCharmedMeson  : particleRadius,
    isBottomMeson   : particleRadius,
    isCcbarMeson    : particleRadius,
    isBbbarMeson    : particleRadius,
    isLightBaryon   : particleRadius,
    isStrangeBaryon : particleRadius,
    isCharmedBaryon : particleRadius,
    isBottomBaryon  : particleRadius,
  }),

  // ...

}

PID.setSizeScheme("default")

STATUS.colorSchemes = {

  default: JSON.stringify({
    isNull       : new THREE.Color("white"        ).getHex(),
    isFinal      : new THREE.Color("lightgrey"    ).getHex(),
    isDecayed    : new THREE.Color("darkgrey"     ).getHex(),
    isBeam       : new THREE.Color("black"        ).getHex(),
    isHard       : new THREE.Color("red"          ).getHex(),
    isMPI        : new THREE.Color("lightsalmon"  ).getHex(),
    isISR        : new THREE.Color("lightseagreen").getHex(),
    isFSR        : new THREE.Color("limegreen"    ).getHex(),
    isRemnant    : new THREE.Color("mediumpurple" ).getHex(),
    isHadronPrep : new THREE.Color("navy"         ).getHex(),
    isHadron     : new THREE.Color("blue"         ).getHex(),
    isDecay      : new THREE.Color("lightskyblue" ).getHex(),
  }),

  pythia: JSON.stringify({
    isNull       : new THREE.Color("white"        ).getHex(),
    isFinal      : new THREE.Color("darkgrey"     ).getHex(),
    isDecayed    : new THREE.Color("lightgrey"    ).getHex(),
    isBeam       : new THREE.Color("black"        ).getHex(),
    isHard       : new THREE.Color("red"          ).getHex(),
    isMPI        : new THREE.Color("lightsalmon"  ).getHex(),
    isISR        : new THREE.Color("lightseagreen").getHex(),
    isFSR        : new THREE.Color("limegreen"    ).getHex(),
    isRemnant    : new THREE.Color("mediumpurple" ).getHex(),
    isHadronPrep : new THREE.Color("blue"         ).getHex(),
    isHadron     : new THREE.Color("blue"         ).getHex(),
    isDecay      : new THREE.Color("lightskyblue" ).getHex(),
  }),

  // ...

}

STATUS.setColorScheme("default")

STATUS.sizeSchemes = {

  default: JSON.stringify({
    isNull       : particleRadius / 2,
    isFinal      : particleRadius / 2,
    isDecayed    : particleRadius / 2,
    isBeam       : particleRadius * 2,
    isHard       : particleRadius * 2,
    isMPI        : particleRadius / 2,
    isISR        : particleRadius,
    isFSR        : particleRadius,
    isRemnant    : particleRadius / 2,
    isHadronPrep : particleRadius / 2,
    isHadron     : particleRadius / 2,
    isDecay      : particleRadius / 2,
  }),

  balanced: JSON.stringify({
    isNull       : particleRadius,
    isFinal      : particleRadius,
    isDecayed    : particleRadius,
    isBeam       : particleRadius,
    isHard       : particleRadius,
    isMPI        : particleRadius,
    isISR        : particleRadius,
    isFSR        : particleRadius,
    isRemnant    : particleRadius,
    isHadronPrep : particleRadius,
    isHadron     : particleRadius,
    isDecay      : particleRadius,
  }),

  hard: JSON.stringify({
    isNull       : particleRadius,
    isFinal      : particleRadius,
    isDecayed    : particleRadius,
    isBeam       : particleRadius * 2,
    isHard       : particleRadius * 2,
    isMPI        : particleRadius,
    isISR        : particleRadius,
    isFSR        : particleRadius,
    isRemnant    : particleRadius,
    isHadronPrep : particleRadius,
    isHadron     : particleRadius,
    isDecay      : particleRadius,
  }),

  shower: JSON.stringify({
    isNull       : particleRadius / 2,
    isFinal      : particleRadius / 2,
    isDecayed    : particleRadius / 2,
    isBeam       : particleRadius * 2,
    isHard       : particleRadius / 2,
    isMPI        : particleRadius / 2,
    isISR        : particleRadius,
    isFSR        : particleRadius,
    isRemnant    : particleRadius / 2,
    isHadronPrep : particleRadius / 2,
    isHadron     : particleRadius / 2,
    isDecay      : particleRadius / 2,
  }),

  // ...

}

STATUS.setSizeScheme("default")

function resetColor() {
  if(colorClass == "class")
    PID.resetColor()
  else if(colorClass == "status")
    STATUS.resetColor()
  updateColorConfig()
  updateParticleColors()
}

function resetSize() {
  if(sizeClass == "class")
    PID.resetSize()
  else if(sizeClass == "status")
    STATUS.resetSize()
  updateSizeConfig()
  updateParticleSizes()
}
