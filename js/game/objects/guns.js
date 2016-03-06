var guns = [
    {
        name: "rifle",
        src: "gun.png",
        strength:     55.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     0.5,
        fireinterval: 60,
        ammo:         12,
        reloadtime:   100,
        lifetime:     240,
        damage:       0.4,
        accuracy:     0.01,
        color:        "rgb(180, 130, 130)"
    },
    {
        name: "tommy gun",
        src: "tommy.png",
        strength:     45.0,
        radius:       0.15,
        density:      1.0,
        friction:     1.0,
        restitution:  0.2,
        selfbink:     0.5,
        fireinterval: 3,
        ammo:         50,
        reloadtime:   100,
        lifetime:     240,
        damage:       0.1,
        accuracy:     0.1,
        color:        "rgb(130, 130, 130)"
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
        color:        "rgb(30, 240, 30)"
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
        color:        "rgb(200, 50, 50)"
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
        fireinterval: 7,
        ammo:         30,
        reloadtime:   80,
        lifetime:     240,
        damage:       0.15,
        accuracy:     0.1,
        color:        "rgb(20, 70, 200)"
    }
];

(function() {
    for(var i=0; i<guns.length; ++i) {
        guns[i].sprite = new Image();
        guns[i].sprite.src = "/img/sprites/guns/" + guns[i].src;
        delete guns[i].src;
    }
})();