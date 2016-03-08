var settings = {
    victoryCondition:{
        stock: false, // Game restarts after lives from settings.ninja.stock are gone
        lastMan: false, // Each death adds respawn time, ends the second  only one player is left alive
    },
    boundary: {
        top:    125,
        bottom: 20,
        left:   60,
        right:  60,
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
        background: {
            r: 20,
            g: 20,
            b: 20
        },
        asteroid: {
            r: 88,
            g: 53,
            b: 53
        },
        boundary: {
            r: 255,
            g: 0,
            b: 0
        }
    },
    crates: {
        health_restore: 5.0,
        jet_fuel:       1000
    },
    collide: {
        ninja_to_ninja_base:     10,
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
        ninja_to_bullet_mult:    0.1,
        ninja_to_bullet_mult_f:  15.0,
        ninja_to_bullet_max_d:   500.0
    },
    spawnpoint: {
        color: 'rgb(26, 32, 60)',
        radius: 3,
        ninja_delay: 240
    },
    map: {
        asteroids:       100,
        place_x_mult:    3,
        place_x_rand:    10,
        place_x_offset:  0,
        place_y_mult:    0,
        place_y_rand:    60,
        place_y_offset: -60
    },
    bots: {
        amount: 20,
        target: "you", //either all or you
        target_switch_nsec: 5,
        jump_nsec: 5,
        max_follow_d: 20
    }
};
