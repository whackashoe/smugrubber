var settings = {
    PTM: 24, /* pixels to meters */
    bounds: {
        top:    100,
        bottom: 100,
        left:   100,
        right:  100,
        color:  'rgb(255, 0, 0)',
        line_w:  1
    },
    controls: {
        key_up:    87,
        key_left:  65,
        key_down:  83,
        key_right: 68,
        key_toss:  70,
        change_weapon: 81 // q
    },
    colors: {
        background: 'rgb(20, 20, 20)',
        asteroid: 'rgb(220, 60, 191)'
    },
    ninja: {
        max_damage: 10000,
        move: {
            strength: 28,
            max_speed: 15
        },
        jetpack: {
            strength:     1.2,
            max_speed:    15,
            max_ammo:     100,
            reload_rate:  0.2
        },
        body: {
            radius: 0.75,
            density: 1.0,
            friction: 0.1,
            restitution: 0.2
        },
        toss: {
            force_mult: 15
        }
    },
    crates: {
        health_restore: 2.0,
        jet_fuel:       1000
    },
    collide: {
        ninja_to_ninja_base:     20,
        ninja_to_ninja_mult:     0.01,
        ninja_to_ninja_mult_f:   1.0,
        ninja_to_ninja_max_d:    500,
        ninja_to_ninja_min:      30,
        ninja_to_asteroid_min:   45,
        ninja_to_asteroid_mult:  0.01,
        ninja_to_asteroid_max_d: 500,
        ninja_to_crate_mult:     0.01,
        ninja_to_crate_mult_f:   0.01,
        ninja_to_crate_max_d:    500,
        ninja_to_bullet_mult:    0.5,
        ninja_to_bullet_mult_f:  50.0,
        ninja_to_bullet_max_d:   50.0
    },
    spawnpoint: {
        color: 'rgb(26, 32, 60)',
        radius: 3,
        ninja_delay: 240
    }
};
