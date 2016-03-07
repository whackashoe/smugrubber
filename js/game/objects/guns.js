var m_guns = [
    {
        name: "rifle",
        src: "gun.png",
        strength:     55.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     0.5,
        fireinterval: 50,
        ammo:         12,
        reloadtime:   100,
        lifetime:     240,
        damage:       0.6,
        accuracy:     0.01,
        color: {
            r: 180,
            g: 130,
            b: 130
        }
    },
    {
        name: "tommy gun",
        src: "tommy.png",
        strength:     40.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     0.5,
        fireinterval: 6,
        ammo:         50,
        reloadtime:   200,
        lifetime:     240,
        damage:       0.2,
        accuracy:     0.1,
        color: {
            r: 130,
            g: 130,
            b: 130
        }
    },
    {
        name: "grenade launcher",
        src: "nade.png",
        strength:     20.0,
        radius:       0.25,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     5.5,
        fireinterval: 100,
        ammo:         6,
        reloadtime:   300,
        lifetime:     240,
        damage:       5.0,
        accuracy:     0.1,
        color: {
            r: 30,
            g: 240,
            b: 30
        }
    },
    {
        name: "sniper",
        src: "sniper.png",
        strength:     80.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     5.5,
        fireinterval: 180,
        ammo:         4,
        reloadtime:   400,
        lifetime:     240,
        damage:       0.9,
        accuracy:     0.01,
        color: {
            r: 200,
            g: 50,
            b: 50
        }
    },
    {
        name: "machine gun",
        src: "machine.png",
        strength:     40.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     0.5,
        fireinterval: 12,
        ammo:         30,
        reloadtime:   40,
        lifetime:     240,
        damage:       0.20,
        accuracy:     0.1,
        color: {
            r: 20,
            g: 70,
            b: 200
        }
    }
];

(function() {
    for(var i=0; i<m_guns.length; ++i) {
        m_guns[i].sprite = new Image();
        m_guns[i].sprite.src = "/img/sprites/guns/" + m_guns[i].src;
        delete m_guns[i].src;
    }
})();
