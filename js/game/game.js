var rng_seed = "" + 1000; //Math.floor(Math.random() * 1000000);
console.log("rng_seed: " + rng_seed);


// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

var canvas    = document.getElementById("canvas");
canvas.width  = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

var gl = initGL();

window.onresize = function() {
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
};

var meter = new FPSMeter();

function dist(x1, y1, x2, y2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

function map(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
}

function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }


function initGL()
{
    var gl;
    try {
        gl = canvas.getContext("webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
        console.log(e);
    }

    if(! gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }

    return gl;
}


var game = {
    world: new Box2D.b2World(new Box2D.b2Vec2(0, -25), false),
    game_offset: { x: 0, y: 0 }, /* translation of game world render */
    listener: new Box2D.JSContactListener(),
    user_data: {},
    sprites: {},
    asteroids: {},
    bullets: {},
    crates: {},
    ninjas: {},
    boundary: {},
    particles: {},
    spawnpoints: {},
    entity_category: {
        asteroid: 1 << 0,
        ninja:    1 << 1,
        bullet:   1 << 2,
        crate:    1 << 3
    },
    iteration: 0,
    asteroids_created: 0,
    mouseDown: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ninja: null,
    camninja: null,
    ninja_ais: [],
    mouseangle: 0.0,
    mousex: 0,
    mousey: 0,
    KEY_UP   : 1,
    KEY_RIGHT: 2,
    KEY_DOWN : 4,
    KEY_LEFT : 8,
    KEY_TOSS : 16,
    keyResult: 0,
    in_main_menu: true,
    RESTART: false,

    color_shader_program: gl.createProgram(),
    texture_shader_program: gl.createProgram(),
    model_view_matrix: mat4.create(),
    model_view_matrix_stack: [],
    perspective_matrix: mat4.create(),
    asteroid_vert_pos_buffer:   gl.createBuffer(),
    asteroid_vert_col_buffer: gl.createBuffer(),

    init: function() {
        // setup input system
        document.onmousedown   = this.mousedown;
        document.onmouseup     = this.mouseup;
        document.onmousemove   = this.mousemove;
        document.oncontextmenu = this.rightclick;
        document.onkeydown     = this.keydown;
        document.onkeyup       = this.keyup;

        // setup collision fun
        this.listener.BeginContact = function(contactPtr) {
            var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
            var udA = contact.GetFixtureA().GetUserData();
            var udB = contact.GetFixtureB().GetUserData();

            if(udA == 0 || udB == 0) {
                console.log("unknown");
                return;
            }

            var tA = game.user_data[udA].type;
            var tB = game.user_data[udB].type;

            if((tA == 'bullet'   && tB == 'bullet')
            || (tA == 'asteroid' && tB == 'asteroid')
            || (tA == 'crate'    && tB == 'crate')
            || (tA == 'crate'    && tB == 'asteroid')
            || (tA == 'asteroid' && tB == 'crate')) {
                return;
            }

            var bA, bB; //body
            if(tA == 'bullet')   { bA = game.bullets[udA].body; }
            if(tA == 'asteroid') { bA = game.asteroids[udA].body; }
            if(tA == 'crate')    { bA = game.crates[udA].body; }
            if(tA == 'ninja')    { bA = game.ninjas[udA].body; }
            
            if(tB == 'bullet')   { bB = game.bullets[udB].body; }
            if(tB == 'asteroid') { bB = game.asteroids[udB].body; }
            if(tB == 'crate')    { bB = game.crates[udB].body; }
            if(tB == 'ninja')    { bB = game.ninjas[udB].body; }
            

            var pxA = bA.GetPosition().get_x();
            var pyA = bA.GetPosition().get_y();
            var pxB = bB.GetPosition().get_x();
            var pyB = bB.GetPosition().get_y();

            var angleAB = Math.atan2(pyB - pyA, pxB - pxA);
            var angleBA = angleAB + Math.PI;

            var vxA = bA.GetLinearVelocity().get_x();
            var vyA = bA.GetLinearVelocity().get_y();
            var vxB = bB.GetLinearVelocity().get_x();
            var vyB = bB.GetLinearVelocity().get_y();

            var vdx = vxA - vxB;
            var vdy = vyA - vyB;

            var impactForce = Math.abs(vdx) + Math.abs(vdy);

            if(tA == 'ninja' && tB == 'ninja') {
                var ninjaA = game.ninjas[udA];
                var ninjaB = game.ninjas[udB];

                var f = settings.collide.ninja_to_ninja_base + impactForce;
                var dA = ninjaA.damage;
                var dB = ninjaB.damage;

                var impulseA = f * (dA + 1.0) * settings.collide.ninja_to_ninja_mult_f;
                var impulseB = f * (dB + 1.0) * settings.collide.ninja_to_ninja_mult_f;

                bA.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleAB) * impulseA, Math.sin(angleAB) * impulseA));
                bB.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleBA) * impulseB, Math.sin(angleBA) * impulseB));

                if(f < settings.collide.ninja_to_ninja_min) {
                    ninjaA.damage += Math.min(settings.collide.ninja_to_ninja_max_d, f * settings.collide.ninja_to_ninja_mult);
                    ninjaB.damage += Math.min(settings.collide.ninja_to_ninja_max_d, f * settings.collide.ninja_to_ninja_mult);
                }
            }


            function bullet_ninja(bullet_ud, ninja_ud, angle) {
                var bullet = game.bullets[bullet_ud];
                var ninja = game.ninjas[ninja_ud];

                var gd = m_guns[bullet.gun_type].damage;
                var f = impactForce * gd * bullet.body.GetMass();
                var d = ninja.damage;

                var impulse = f * (d + 1.0) * settings.collide.ninja_to_bullet_mult_f;

                bA.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angle) * impulse, Math.sin(angle) * impulse));

                ninja.damage += Math.min(settings.collide.ninja_to_bullet_max_d, f * settings.collide.ninja_to_bullet_mult);

                ninja.get_shot(bullet);
            }

            function bullet_asteroid(bullet_ud) {
                var bullet = game.bullets[bullet_ud];
                bullet.alive = false;
            }
            
            function bullet_crate(bullet_ud) {
                var bullet = game.bullets[bullet_ud];
                bullet.alive = false;
            }
            
            function asteroid_ninja(ninja_ud) {
                var ninja = game.ninjas[ninja_ud];

                if(impactForce > settings.collide.ninja_to_asteroid_min) {
                    ninja.damage += impactForce * settings.collide.ninja_to_asteroid_mult;
                }

                ninja.touching_ground = true;
            }
            
            function crate_ninja(crate_ud, ninja_ud, angle) {
                var crate = game.crates[crate_ud];
                var ninja = game.ninjas[ninja_ud];

                var f = impactForce * crate.body.GetMass() * m_crates[crate.crate_type].damage;
                var d = ninja.damage;

                if(f > m_crates[crate.crate_type].min_dforce) {
                    ninja.damage += Math.min(settings.collide.ninja_to_crate_max_d, f * settings.collide.ninja_to_crate_mult)
                    var impulse = f * (d + 1.0) * settings.collide.ninja_to_crate_mult_f;

                    bA.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angle) * impulse, Math.sin(angle) * impulse));
                } else {
                    ninja.pickup_crate(crate);
                }
            }

            if(tA == 'ninja' && tB == 'bullet') {
                bullet_ninja(udB, udA, angleBA);
            }

            if(tA == 'bullet' && tB == 'ninja') {
                bullet_ninja(udA, udB, angleAB);
            }

            if(tA == 'crate' && tB == 'bullet') {
                bullet_crate(udB);
            }

            if(tA == 'bullet' && tB == 'crate') {
                bullet_crate(udA);
            }

            if(tA == 'asteroid' && tB == 'bullet') {
                bullet_asteroid(udB);
            }

            if(tA == 'bullet' && tB == 'asteroid') {
                bullet_asteroid(udA);
            }

            if(tA == 'ninja' && tB == 'asteroid') {
                asteroid_ninja(udA);
            }

            if(tA == 'asteroid' && tB == 'ninja') {
                asteroid_ninja(udB);
            }

            if(tA == 'ninja' && tB == 'crate') {
                crate_ninja(udB, udA, angleBA);
            }

            if(tA == 'crate' && tB == 'ninja') {
                crate_ninja(udA, udB, angleAB);
            }
        };

        this.listener.EndContact = function(contactPtr) {
            var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
            var udA = contact.GetFixtureA().GetUserData();
            var udB = contact.GetFixtureB().GetUserData();

            if(udA == 0 || udB == 0) {
                console.log("unknown");
                return;
            }

            var tA = game.user_data[udA].type;
            var tB = game.user_data[udB].type;

            if((tA == 'bullet'   && tB == 'bullet')
            || (tA == 'asteroid' && tB == 'asteroid')
            || (tA == 'crate'    && tB == 'crate')
            || (tA == 'crate'    && tB == 'asteroid')
            || (tA == 'asteroid' && tB == 'crate')) {
                return;
            }

            var bA, bB; //body
            if(tA == 'bullet')   { bA = game.bullets[udA].body; }
            if(tA == 'asteroid') { bA = game.asteroids[udA].body; }
            if(tA == 'crate')    { bA = game.crates[udA].body; }
            if(tA == 'ninja')    { bA = game.ninjas[udA].body; }
            
            if(tB == 'bullet')   { bB = game.bullets[udB].body; }
            if(tB == 'asteroid') { bB = game.asteroids[udB].body; }
            if(tB == 'crate')    { bB = game.crates[udB].body; }
            if(tB == 'ninja')    { bB = game.ninjas[udB].body; }
            


            function asteroid_ninja(ninja_ud) {
                var ninja = game.ninjas[ninja_ud];
                ninja.touching_ground = false;
            }

            if(tA == 'ninja' && tB == 'asteroid') {
                asteroid_ninja(udA);
            }

            if(tA == 'asteroid' && tB == 'ninja') {
                asteroid_ninja(udB);
            }

        };

        // Empty implementations for unused methods.
        this.listener.PreSolve   = function() {};
        this.listener.PostSolve  = function() {};

        this.world.SetContactListener(this.listener);

        this.sprites.ninja = new Image();
        this.sprites.ninja.src = '/img/sprites/ninjas/ninja.png';


        var bounds = { left: 0, right: 0, top: 0, bottom: 0 };

        for(var i=0; i<settings.map.asteroids; i++) {
            var x = settings.map.place_x_offset + (i*settings.map.place_x_mult) + (Math.random() * settings.map.place_x_rand);
            var y = settings.map.place_y_offset + (i*settings.map.place_y_mult) + (Math.random() * settings.map.place_y_rand);

            if (x < bounds.left)   { bounds.left   = x; }
            if (x > bounds.right)  { bounds.right  = x; }
            if (y > bounds.top)    { bounds.top    = y; }
            if (y < bounds.bottom) { bounds.bottom = y; }

            this.create_asteroid(x, y);
        }

        for(var i in game.asteroids) {
            var sp_x = game.asteroids[i].body.GetPosition().get_x();
            var sp_y = game.asteroids[i].body.GetPosition().get_y() + 15;

            game.attempt_to_add_spawn_point(sp_x, sp_y);
        }

        for(var i in game.spawnpoints) {
            var s = game.spawnpoints[i];
            this.create_crate(s.x, s.y, 0, 0, Math.random() < 0.5 ? 0 : 1);
        }

        game.boundary = {
            left:   bounds.left   - settings.bounds.left,
            right:  bounds.right  + settings.bounds.right,
            bottom: bounds.bottom - settings.bounds.bottom,
            top:    bounds.top    + settings.bounds.top,

            render: function() {
                ctx.strokeStyle = settings.bounds.color;
                ctx.lineWidth = settings.bounds.line_w;
                ctx.rect(this.left, this.top, this.right - this.left, this.bottom - this.top);
                ctx.stroke();
            }
        };
        
        // load bots
        for(var i=0; i<settings.bots.amount; ++i) {
            var id = game.create_ninja();
            var s = game.random_spawn_point();
            game.ninjas[id].spawn(s.x, s.y);
            game.ninja_ais.push(game.ninja_ai_controller(game.ninjas[id]));
            game.camninja = game.ninjas[id];
        }


        // setup graphics system
        game.init_shaders();
        game.generate_asteroid_gl_buffers();
        game.generate_crates_gl_buffers();
        game.generate_guns_gl_buffers();
        game.generate_ninjas_gl_buffers();

        gl.clearColor(
            settings.colors.background.r / 255.0,
            settings.colors.background.g / 255.0,
            settings.colors.background.b / 255.0,
            1.0
        );
    },

    generate_crates_gl_buffers: function() {
        for(var i=0; i<m_crates.length; ++i) {
            var w = m_crates[i].width;
            var h = m_crates[i].height;

            m_crates[i].pos_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, m_crates[i].pos_buffer);

            var vertices = [];
            vertices.push(-w, -h, 0);
            vertices.push( w, -h, 0);
            vertices.push( w,  h, 0);

            vertices.push(-w, -h, 0);
            vertices.push(-w,  h, 0);
            vertices.push( w,  h, 0);

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            m_crates[i].pos_buffer.itemSize = 3;
            m_crates[i].pos_buffer.numItems = vertices.length / 3;

            m_crates[i].col_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, m_crates[i].col_buffer);
            var colors = [];
            for(var j=0; j<vertices.length / 3; ++j) {
                colors.push(
                    m_crates[i].color.r / 255.0,
                    m_crates[i].color.g / 255.0,
                    m_crates[i].color.b / 255.0,
                    1.0
                );
            }

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            m_crates[i].col_buffer.itemSize = 4;
            m_crates[i].col_buffer.numItems = colors.length / 4;

        }
    },

    generate_guns_gl_buffers: function() {
        for(var i=0; i<m_guns.length; ++i) {
            var r = m_guns[i].radius;

            m_guns[i].pos_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, m_guns[i].pos_buffer);

            var vertices = [];
            var quality = 10;
            for(var j=0; j<quality; ++j) {
                vertices.push(0, 0, 0);
                var a1 = (Math.PI * 2) / quality * j;
                var a2 = (Math.PI * 2) / quality * ((j + 1) % quality);
                vertices.push(Math.cos(a1) * r, Math.sin(a1) * r, 0);
                vertices.push(Math.cos(a2) * r, Math.sin(a2) * r, 0);
            }

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            m_guns[i].pos_buffer.itemSize = 3;
            m_guns[i].pos_buffer.numItems = vertices.length / 3;

            m_guns[i].col_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, m_guns[i].col_buffer);
            var colors = [];
            for(var j=0; j<vertices.length / 3; ++j) {
                colors.push(
                    m_guns[i].color.r / 255.0,
                    m_guns[i].color.g / 255.0,
                    m_guns[i].color.b / 255.0,
                    1.0
                );
            }

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            m_guns[i].col_buffer.itemSize = 4;
            m_guns[i].col_buffer.numItems = colors.length / 4;
        }
    },

    generate_ninjas_gl_buffers: function() {
        var m = m_ninjas[0];

        m.pos_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, m.pos_buffer);

        var vertices = [];
        var r = m.body.radius;
        vertices.push(-r, -r, 0);
        vertices.push( r, -r, 0);
        vertices.push( r,  r, 0);
        vertices.push(-r,  r, 0);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        m.pos_buffer.itemSize = 3;
        m.pos_buffer.numItems = vertices.length / 3;

        m.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, m.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));

        m.texture.image = new Image();
        m.texture.image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, m.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.texture.image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.bindTexture(gl.TEXTURE_2D, null);
        };
        m.texture.image.src = "/img/sprites/ninjas/ninja.png";



        m.texture_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, m.texture_buffer);
        var tcoords = [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tcoords), gl.STATIC_DRAW);
        m.texture_buffer.itemSize = 2;
        m.texture_buffer.numItems = tcoords.length / 2;

        m.vert_index_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.vert_index_buffer);
        var vert_indexs = [0, 1, 2,     0, 2, 3];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vert_indexs), gl.STATIC_DRAW);
        m.vert_index_buffer.itemSize = 1;
        m.vert_index_buffer.numItems = vert_indexs.length;
    },

    pushMatrix: function() {
        var copy = mat4.create();
        mat4.set(game.model_view_matrix, copy);
        game.model_view_matrix_stack.push(copy);
    },

    popMatrix: function() {
        if(game.model_view_matrix_stack.length == 0) {
            throw "Popped matrix when size was 0";
        }

        game.model_view_matrix = game.model_view_matrix_stack.pop();
    },

    get_shader: function(id) {
        var shaderScript = document.getElementById(id);
        if(! shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if(! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    },

    init_shaders: function() {
        var color_fragment_shader = game.get_shader("color-shader-fs");
        var color_vertex_shader   = game.get_shader("color-shader-vs");

        gl.attachShader(game.color_shader_program, color_vertex_shader);
        gl.attachShader(game.color_shader_program, color_fragment_shader);
        gl.linkProgram(game.color_shader_program);

        if(! gl.getProgramParameter(game.color_shader_program, gl.LINK_STATUS)) {
            alert("Could not initialise color shader");
            return;
        }

        gl.useProgram(game.color_shader_program);

        game.color_shader_program.vertex_position_attribute = gl.getAttribLocation(game.color_shader_program, "vert_pos_attr");
        gl.enableVertexAttribArray(game.color_shader_program.vertex_position_attribute);

        game.color_shader_program.vertex_color_attribute = gl.getAttribLocation(game.color_shader_program, "vert_col_attr");
        gl.enableVertexAttribArray(game.color_shader_program.vertex_color_attribute);

        game.color_shader_program.perspective_matrix_uniform  = gl.getUniformLocation(game.color_shader_program, "perspective_matrix");
        game.color_shader_program.model_view_matrix_uniform = gl.getUniformLocation(game.color_shader_program, "model_view_matrix");



        var texture_fragment_shader = game.get_shader("texture-shader-fs");
        var texture_vertex_shader   = game.get_shader("texture-shader-vs");

        gl.attachShader(game.texture_shader_program, texture_vertex_shader);
        gl.attachShader(game.texture_shader_program, texture_fragment_shader);
        gl.linkProgram(game.texture_shader_program);

        if(! gl.getProgramParameter(game.texture_shader_program, gl.LINK_STATUS)) {
            alert("Could not initialise texture shader");
            return;
        }

        gl.useProgram(game.texture_shader_program);

        game.texture_shader_program.vertex_position_attribute = gl.getAttribLocation(game.texture_shader_program, "vert_pos_attr");
        gl.enableVertexAttribArray(game.texture_shader_program.vertex_position_attribute);

        game.texture_shader_program.texture_coord_attribute = gl.getAttribLocation(game.texture_shader_program, "texture_coord_attr");
        gl.enableVertexAttribArray(game.texture_shader_program.texture_coord_attribute);

        game.texture_shader_program.perspective_matrix_uniform  = gl.getUniformLocation(game.texture_shader_program, "perspective_matrix");
        game.texture_shader_program.model_view_matrix_uniform = gl.getUniformLocation(game.texture_shader_program, "model_view_matrix");
        game.texture_shader_program.sampler_uniform = gl.getUniformLocation(game.texture_shader_program, "sampler");
    },

    generate_asteroid_gl_buffers: function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, game.asteroid_vert_pos_buffer);
        var vertices = [];

        for(var i in game.asteroids) {
            var m = game.asteroids[i];
            var pos = m.body.GetPosition();

            for(var i=0; i<m.verts.length-1; i++) {
                vertices.push(pos.get_x() + m.render_center.x,    pos.get_y() + m.render_center.y,    0.0);
                vertices.push(pos.get_x() + m.verts[i].get_x(),   pos.get_y() + m.verts[i].get_y(),   0.0);
                vertices.push(pos.get_x() + m.verts[i+1].get_x(), pos.get_y() + m.verts[i+1].get_y(), 0.0);
            }

            vertices.push(pos.get_x() + m.render_center.x,                 pos.get_y() + m.render_center.y,                 0.0);
            vertices.push(pos.get_x() + m.verts[m.verts.length-1].get_x(), pos.get_y() + m.verts[m.verts.length-1].get_y(), 0.0);
            vertices.push(pos.get_x() + m.verts[0].get_x(),                pos.get_y() + m.verts[0].get_y(),                0.0);
        }

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        game.asteroid_vert_pos_buffer.itemSize = 3;
        game.asteroid_vert_pos_buffer.numItems = vertices.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, game.asteroid_vert_col_buffer);

        var colors = [];
        for(var i in game.asteroids) {
            var m = game.asteroids[i];

            for(var i=0; i<m.verts.length-1; i++) {
                colors.push(
                    settings.colors.asteroid.r / 255.0,
                    settings.colors.asteroid.g / 255.0,
                    settings.colors.asteroid.b / 255.0,
                    1.0
                );
                colors.push(
                    settings.colors.asteroid.r / (255.0 - (Math.random() * 10)),
                    settings.colors.asteroid.g / (255.0 - (Math.random() * 10)),
                    settings.colors.asteroid.b / (255.0 - (Math.random() * 10)),
                    1.0
                );
                colors.push(
                    settings.colors.asteroid.r / (255.0 - (Math.random() * 10)),
                    settings.colors.asteroid.g / (255.0 - (Math.random() * 10)),
                    settings.colors.asteroid.b / (255.0 - (Math.random() * 10)),
                    1.0
                );
            }

            colors.push(
                settings.colors.asteroid.r / 255.0,
                settings.colors.asteroid.g / 255.0,
                settings.colors.asteroid.b / 255.0,
                1.0
            );
            colors.push(
                settings.colors.asteroid.r / (255.0 - (Math.random() * 10)),
                settings.colors.asteroid.g / (255.0 - (Math.random() * 10)),
                settings.colors.asteroid.b / (255.0 - (Math.random() * 10)),
                1.0
            );
            colors.push(
                settings.colors.asteroid.r / (255.0 - (Math.random() * 10)),
                settings.colors.asteroid.g / (255.0 - (Math.random() * 10)),
                settings.colors.asteroid.b / (255.0 - (Math.random() * 10)),
                1.0
            );
        }

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        game.asteroid_vert_col_buffer.itemSize = 4;
        game.asteroid_vert_col_buffer.numItems = colors.length / 4;
    },

    add_user_data: function(data) {
        var id = Math.floor(Math.random() * Math.pow(2, 31));
        game.user_data[id] = data;
        return id;
    },

    attempt_to_add_spawn_point: function(x, y) {
        var r = settings.spawnpoint.radius;

        var cool = true;

        for(var j in game.asteroids) {
            var aj = game.asteroids[j];

            var jx = aj.body.GetPosition().get_x();
            var jy = aj.body.GetPosition().get_y();;

            if(jx + aj.width > x - r && jx - aj.width < x + r && jy + aj.height > y - r && jy - aj.height < y + r) {
                cool = false;
                break;
            }
        }

        if(cool) {
            this.create_spawnpoint(x, y);
        }
    },

    random_spawn_point: function() {
        var keys = Object.keys(game.spawnpoints)
        return game.spawnpoints[keys[ keys.length * Math.random() << 0]];
    },

    body_distance(a, b) {
        return dist(a.GetPosition().get_x(), a.GetPosition().get_y(), b.GetPosition().get_x(), b.GetPosition().get_y());
    },

    create_spawnpoint: function(x, y) {
        var id = game.add_user_data({ type: 'spawnpoint' });

        game.spawnpoints[id] = {
            x: x,
            y: y,
            render: function() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, settings.spawnpoint.radius, 0, 2*Math.PI);
                ctx.strokeStyle = settings.spawnpoint.color;
                ctx.stroke();
                ctx.closePath();
            }
        };
        
        return id;
    },

    create_bullet: function(x, y, px, py, gun_type) {
        var id = game.add_user_data({ type: 'bullet', gun_type: gun_type });
        var radius = m_guns[gun_type].radius;

        var bd = new Box2D.b2BodyDef();
        bd.set_type(Box2D.b2_dynamicBody);
        bd.set_position( new Box2D.b2Vec2(x, y) );

        var circleShape = new Box2D.b2CircleShape();
        circleShape.set_m_radius(radius);

        var filter = new Box2D.b2Filter();
        filter.set_categoryBits(game.entity_category.bullet);
        filter.set_maskBits(game.entity_category.ninja | game.entity_category.crate | game.entity_category.asteroid);

        var fd = new Box2D.b2FixtureDef();
        fd.set_shape(circleShape);
        fd.set_density(m_guns[gun_type].density);
        fd.set_friction(m_guns[gun_type].friction);
        fd.set_restitution(m_guns[gun_type].restitution);
        fd.set_userData(id);
        fd.set_filter(filter);

        var body = this.world.CreateBody(bd);
        body.CreateFixture(fd);
        body.SetLinearVelocity(new Box2D.b2Vec2(px, py));

        var that = this;

        game.bullets[id] = {
            body: body,
            radius: radius,
            lifetime: m_guns[gun_type].lifetime,
            gun_type: gun_type,
            alive: true,

            render: function() {
                var pos = this.body.GetPosition();
                game.pushMatrix();
                    mat4.translate(game.model_view_matrix, [
                        pos.get_x(),
                        pos.get_y(),
                        0.0
                    ]);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_guns[this.gun_type].pos_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_position_attribute, m_guns[this.gun_type].pos_buffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_guns[this.gun_type].col_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_color_attribute, m_guns[this.gun_type].col_buffer.itemSize, gl.FLOAT, false, 0, 0);
                    
                    gl.uniformMatrix4fv(game.color_shader_program.perspective_matrix_uniform, false, game.perspective_matrix);
                    gl.uniformMatrix4fv(game.color_shader_program.model_view_matrix_uniform, false, game.model_view_matrix);

                    gl.drawArrays(gl.TRIANGLES, 0, m_guns[this.gun_type].pos_buffer.numItems);
                game.popMatrix();
            },

            update: function() {
                if(! this.alive) {
                    return;
                }

                this.alive = --this.lifetime > 0;
            }
        };
    },

    create_ninja: function() {
        var id = game.add_user_data({ type: 'ninja' });
        var ninja_type = 0;

        game.ninjas[id] = {
            body: null,
            alive: true,
            ninja_type: ninja_type,
            stock: m_ninjas[ninja_type].stock,
            deaths: 0,
            facing_dir: -1,
            gun_angle: 0.0,
            touching_ground: false,
            respawn_counter: 0,
            animation: {

            },
            name: ((Math.random() < 0.5) ? "Dan" : "Jett"),

            spawn: function(x, y) {
                var bd = new Box2D.b2BodyDef();
                bd.set_type(Box2D.b2_dynamicBody);
                bd.set_position(new Box2D.b2Vec2(x, y));
                bd.set_fixedRotation(true);
                bd.set_bullet(true);

                var circleShape = new Box2D.b2CircleShape();
                circleShape.set_m_radius(m_ninjas[this.ninja_type].body.radius);

                var filter = new Box2D.b2Filter();
                filter.set_categoryBits(game.entity_category.ninja);
                filter.set_maskBits(game.entity_category.bullet | game.entity_category.ninja | game.entity_category.asteroid | game.entity_category.crate);

                var fd = new Box2D.b2FixtureDef();
                fd.set_shape(circleShape);
                fd.set_density(m_ninjas[this.ninja_type].body.density);
                fd.set_friction(m_ninjas[this.ninja_type].body.friction);
                fd.set_restitution(m_ninjas[this.ninja_type].body.restitution);
                fd.set_userData(id);
                fd.set_filter(filter);

                if(this.body != null) {
                    game.world.DestroyBody(this.body);
                }
                this.body = game.world.CreateBody(bd);
                this.body.CreateFixture(fd);

                this.alive = true;
                this.damage = 0;

                var gun_type = Math.floor(Math.random() * m_guns.length);
                this.gun = {
                    type: gun_type,
                    ammo:         m_guns[gun_type].ammo,
                    fireinterval: m_guns[gun_type].fireinterval,
                    src: m_guns[gun_type].src,
                    reloadtime:   0
                };

                this.jetpack = {
                    ammo: m_ninjas[this.ninja_type].jetpack.max_ammo
                };
            },

            render: function() {
                var pos = this.body.GetPosition();

                // draw gun
                /*game.pushMatrix();
                    mat4.translate(game.model_view_matrix, [
                        pos.get_x(),
                        pos.get_y(),
                        0.0
                    ]);
                    mat4.scale(game.model_view_matrix, [1, this.facing_dir, 1]);
                    mat4.rotate(game.model_view_matrix, this.gun_angle * this.facing_dir, [0, 0, 1]);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_ninjas[this.ninja_type].pos_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_position_attribute, m_ninjas[this.ninja_type].pos_buffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_ninjas[this.ninja_type].col_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_color_attribute, m_ninjas[this.ninja_type].col_buffer.itemSize, gl.FLOAT, false, 0, 0);
                    
                    gl.uniformMatrix4fv(game.color_shader_program.perspective_matrix_uniform, false, game.perspective_matrix);
                    gl.uniformMatrix4fv(game.color_shader_program.model_view_matrix_uniform, false, game.model_view_matrix);

                    gl.drawArrays(gl.TRIANGLES, 0, m_ninjas[this.ninja_type].pos_buffer.numItems);
                game.popMatrix();*/

                // draw ninja
                game.pushMatrix();
                    mat4.translate(game.model_view_matrix, [
                        pos.get_x(),
                        pos.get_y(),
                        0.0
                    ]);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_ninjas[this.ninja_type].pos_buffer);
                    gl.vertexAttribPointer(game.texture_shader_program.vertex_position_attribute, m_ninjas[this.ninja_type].pos_buffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_ninjas[this.ninja_type].texture_buffer);
                    gl.vertexAttribPointer(game.texture_shader_program.texture_coord_attribute, m_ninjas[this.ninja_type].texture_buffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, m_ninjas[this.ninja_type].texture);
                    gl.uniform1i(game.texture_shader_program.sampler_uniform, 0);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m_ninjas[this.ninja_type].vert_index_buffer);
                    gl.uniformMatrix4fv(game.texture_shader_program.perspective_matrix_uniform, false, game.perspective_matrix);
                    gl.uniformMatrix4fv(game.texture_shader_program.model_view_matrix_uniform, false, game.model_view_matrix);

                    gl.drawElements(gl.TRIANGLES, m_ninjas[this.ninja_type].vert_index_buffer.numItems, gl.UNSIGNED_SHORT, 0);
                game.popMatrix();
            },

            update: function() {
                if(! this.alive) {
                    if(this.respawn_counter > 0) {
                        this.respawn_counter--;
                        // if(this.respawn_counter == 0 && this.stock > 0) {
                        if(this.respawn_counter == 0){
                            if(settings.victoryCondition.stock && this.stock < 1){
                                console.log("Figure out how to delete the character");
                                this.respawn_counter = 10000;
                            }else{
                                var s = game.random_spawn_point();
                                this.spawn(s.x, s.y); 
                            }
                        }
                    }

                    return;
                }

                this.damage = Math.min(this.damage, m_ninjas[this.ninja_type].max_damage);

                if(this.gun.fireinterval > 0) {
                    this.gun.fireinterval--;
                }

                if(this.gun.reloadtime > 0) {
                    this.gun.reloadtime--;
                }

                if(this.jetpack.ammo < m_ninjas[this.ninja_type].jetpack.max_ammo) {
                    this.jetpack.ammo += m_ninjas[this.ninja_type].jetpack.reload_rate;
                }
            },

            move: function(dir) {
                if(! this.alive) {
                    return;
                }

                if(Math.abs(this.body.GetLinearVelocity().get_x()) < m_ninjas[this.ninja_type].move.max_speed || sign(dir) != sign(this.body.GetLinearVelocity().get_x())) {
                    this.body.ApplyForceToCenter(new Box2D.b2Vec2(m_ninjas[this.ninja_type].move.strength * dir, 0.0));
                }
            },

            shoot: function(angle) {
                if(! this.alive) {
                    return;
                }

                if(this.gun.fireinterval != 0 || this.gun.reloadtime != 0) {
                    return;
                }

                if(this.gun.ammo == 0) {
                    this.gun.ammo = m_guns[this.gun.type].ammo;
                    this.gun.reloadtime = m_guns[this.gun.type].reloadtime;
                    return;
                }

                var strength = m_guns[this.gun.type].strength;
                angle += m_guns[this.gun.type].accuracy * noise.simplex2(game.iteration, 0);

                if(isNaN(this.body.GetPosition().get_x())) {
                    alert("cb x nan");
                }
                if(isNaN( angle)) {
                    alert("cb angle nan");
                }

                game.create_bullet(
                    this.body.GetPosition().get_x() + (Math.cos(angle) * m_ninjas[this.ninja_type].body.radius * 2),
                    this.body.GetPosition().get_y() + (Math.sin(angle) * m_ninjas[this.ninja_type].body.radius * 2),
                    this.body.GetLinearVelocity().get_x() + (Math.cos(angle) * strength),
                    this.body.GetLinearVelocity().get_y() + (Math.sin(angle) * strength),
                    this.gun.type
                );

                var bink_strength = m_guns[this.gun.type].selfbink;
                var bink_angle = angle+Math.PI;
                this.body.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(bink_angle) * bink_strength, Math.sin(bink_angle) * bink_strength));


                this.gun.fireinterval = m_guns[this.gun.type].fireinterval;
                this.gun.ammo--;

                if(this.gun.ammo == 0) {
                    this.gun.ammo = m_guns[this.gun.type].ammo;
                    this.gun.reloadtime = m_guns[this.gun.type].reloadtime;
                    return;
                }
            },

            jump: function() {
                if(! this.alive) {
                    return;
                }

                //todo fix contact detect
                //maybe just need to loop thru clist?
                var strength = 15;
                if(this.touching_ground) {
                    this.body.ApplyLinearImpulse(new Box2D.b2Vec2(0.0, strength));
                    this.body.SetAngularVelocity(0.0);
                }
            },

            fire_jetpack: function() {
                if(! this.alive) {
                    return;
                }

                if(this.jetpack.ammo < 0) {
                    return;
                }

                if(this.body.GetLinearVelocity().get_y() < m_ninjas[this.ninja_type].jetpack.max_speed) {
                    this.body.ApplyLinearImpulse(new Box2D.b2Vec2(0.0, m_ninjas[this.ninja_type].jetpack.strength));
                    game.create_particle(this.body.GetPosition().get_x(), this.body.GetPosition().get_y(), (-0.5 + Math.random()) / settings.PTM, -0.1 + (-0.5 + Math.random()) / settings.PTM, 0);
                }

                this.jetpack.ammo--;
            },

            pickup_crate: function(crate) {
                if(! this.alive) {
                    return;
                }

                if(! crate.alive) {
                    return;
                }

                // health pack
                if(crate.crate_type == 0) {
                    this.damage = Math.max(0, this.damage - settings.crates.health_restore);
                }
                if(crate.crate_type == 1) {
                    this.jetpack.ammo += settings.crates.jet_fuel;
                }

                crate.alive = false;
            },

            toss: function(f, angle) {
                if(! this.alive) {
                    return;
                }

                console.log("toss: " + f + " : " + angle);
                var x = this.body.GetPosition().get_x();
                var y = this.body.GetPosition().get_y();
                var force = m_ninjas[this.ninja_type].toss.force_mult * f;
                var crate_type = 1;
                game.create_crate(x + (Math.cos(angle) * ((m_ninjas[this.ninja_type].body.radius * 2) + crates[crate_type].width)),
                    y + (Math.sin(angle) * ((m_ninjas[this.ninja_type].body.radius * 2)+ crates[crate_type].height)),
                    this.body.GetLinearVelocity().get_x() + (Math.cos(angle) * force),
                    this.body.GetLinearVelocity().get_y() + (Math.sin(angle) * force),
                    crate_type
                );
            },

            get_shot: function(bullet) {
                bullet.alive = false;
            },

            set_gun: function(gun_type) {
                if(! this.alive) {
                    return;
                }

                this.gun = {
                    type: gun_type,
                    ammo:         guns[gun_type].ammo,
                    fireinterval: guns[gun_type].fireinterval,
                    reloadtime:   0
                };
            }
        };

        return id;
    },

    ninja_human_controller: function(ninja) {
        return {
            n: ninja,
            angle: 0.0,
            toss_counter: 0,
            update: function() {
                this.n.facing_dir = (game.mousex < window.innerWidth / 2) ? 1 : -1;
                this.angle = Math.atan2((canvas.height / 2) - game.mousey, game.mousex - canvas.width / 2);
                this.n.gun_angle = this.angle;

                if(game.mouseDown[0] ) {
                    this.n.shoot(this.angle);
                }

                if(game.mouseDown[2]) {
                   this.n.fire_jetpack(); 
                }

                switch(game.keyResult) {
                    case game.KEY_UP:
                        this.n.jump();
                        break;
                    case game.KEY_LEFT:
                        this.n.move(-1);
                        break;
                    case game.KEY_RIGHT:
                        this.n.move(1);
                        break;
                    case game.KEY_UP|game.KEY_LEFT:
                        this.n.jump();
                        this.n.move(-1);
                        break;
                    case game.KEY_UP|game.KEY_RIGHT:
                        this.n.jump();
                        this.n.move(1);
                        break;
                }
                
                if(game.keyResult & game.KEY_TOSS) {
                    this.toss_counter++;
                } else if(this.toss_counter > 0) {
                    var toss_force = Math.min(this.toss_counter, 60) / 60.0;
                    this.n.toss(toss_force, this.angle);
                    this.toss_counter = 0;
                }
            }
        };
    },

    ninja_ai_controller: function(ninja) {
        return {
            n: ninja,
            home: {
                x: ninja.body.GetPosition().get_x(),
                y: ninja.body.GetPosition().get_y()
            },
            target: null,
            update: function() {
                if(this.target == null ||
                    (
                        settings.bots.target == "random" && (
                            !  this.target.alive
                            ||  Math.random() < 1.0 / (settings.bots.target_switch_nsec * 60)
                            || game.body_distance(this.n.body, this.target.body) > settings.bots.max_follow_d
                        )
                    )
                ) {
                    var tries = 0;
                    do {
                        var keys = Object.keys(game.ninjas)
                        this.target = game.ninjas[keys[ keys.length * Math.random() << 0]];
                    } while(! this.target.alive && tries < 5);
                }

                if(settings.bots.target == "you" && game.ninja != null) {
                    this.target = game.ninja.n;
                }

                this.n.facing_dir = this.n.body.GetPosition().get_x() <  ((this.home.x + this.target.body.GetPosition().get_x()) / 2) ? 1 : -1;
                this.n.move(this.n.facing_dir);
                var y_cmp = ((this.home.y + this.target.body.GetPosition().get_y()) / 2) - 10;
                if(this.n.body.GetPosition().get_y() < y_cmp) {
                    this.n.fire_jetpack();
                }

                if(Math.random() < 1.0 / (settings.bots.jump_nsec * 60)) {
                    this.n.jump();
                }

                var angle = Math.atan2(
                    this.target.body.GetPosition().get_y() -this.n.body.GetPosition().get_y(),
                    this.target.body.GetPosition().get_x() -this.n.body.GetPosition().get_x()
                );

                this.n.shoot(angle);
            }
        };
    },

    create_asteroid: function(x, y) {
        var id = game.add_user_data({ type: 'asteroid' });
        this.asteroids_created++;
        var size = 3.5 + (Math.random() * 2.5);
        var edges = 15 + (Math.floor(Math.random()*10));
        var xtoy = 0.25 + (Math.random() * 1.5);
        var ytox = 0.25 + (Math.random() * 1.5);
        var width = 0;
        var height = 0;

        var verts = [];
        for(var i=0; i<edges; i++) {
            var a = Math.PI * 2 / edges * i;
            var ax = Math.cos(a);
            var ay = Math.sin(a);

            var nx = 0.5 + Math.abs(noise.simplex2(ax / 1.613 + (x / 13.2) + (y / 82.45), ay / 1.73  + (x / 13.2) + (y / 82.45)));
            var ny = 0.5 + Math.abs(noise.simplex2(ay / 1.613 + (y / 13.2) + (x / 82.45), ax / 1.73  + (y / 13.2) + (x / 82.45)));

            var mx = xtoy * (ax * (size / 2 + nx) * size / 2);
            var my = ytox * (ay * (size / 2 + ny) * size / 2);

            if(Math.abs(mx) > width) {
                width = Math.abs(mx);
            }

            if(Math.abs(my) > height) {
                height = Math.abs(my);
            }

            verts.push(new Box2D.b2Vec2(mx, my));
        }

        var render_center = { x: 0, y: 0 };
        for(var i=0; i<verts.length; i++) {
            render_center.x += verts[i].get_x();
            render_center.y += verts[i].get_y();
        }
        render_center.x /= verts.length;
        render_center.y /= verts.length;


        var bd = new Box2D.b2BodyDef();
        bd.set_type(Box2D.b2_staticBody);
        bd.set_position( new Box2D.b2Vec2(x, y) );

        var body = this.world.CreateBody(bd);


        for(var i=0; i<verts.length; i++) {
            var vertices = [ 
                new Box2D.b2Vec2( 0.0, 0.0 ), 
                verts[i], 
                verts[(i+1) % verts.length] 
            ];

            var polygonShape = new Box2D.b2PolygonShape();                
            var buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
            var offset = 0;


            Box2D.setValue(buffer+(0),    vertices[0].get_x(), 'float');
            Box2D.setValue(buffer+(0+4),  vertices[0].get_y(), 'float');
            Box2D.setValue(buffer+(8),    vertices[1].get_x(), 'float');
            Box2D.setValue(buffer+(8+4),  vertices[1].get_y(), 'float');
            Box2D.setValue(buffer+(16),   vertices[2].get_x(), 'float');
            Box2D.setValue(buffer+(16+4), vertices[2].get_y(), 'float');      
            
            var ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
            polygonShape.Set(ptr_wrapped, vertices.length);

            var filter = new Box2D.b2Filter();
            filter.set_categoryBits(game.entity_category.asteroid);
            filter.set_maskBits(game.entity_category.bullet | game.entity_category.ninja | game.entity_category.crate);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(polygonShape);
            fd.set_density(1.0);
            fd.set_friction(1.0);
            fd.set_restitution(0.1);
            fd.set_userData(id);
            fd.set_filter(filter);
            
            body.CreateFixture(fd);
        }

        game.asteroids[id] = {
            body: body,
            verts: verts,
            height: height,
            width: width,
            render_center: render_center,
            alive: true,
        };

        return id;
    },

    create_crate: function(x, y, px, py, crate_type) {
        var id = game.add_user_data({ type: 'crate', crate_type: crate_type });
        var width  = m_crates[crate_type].width;
        var height = m_crates[crate_type].height;

        var bd = new Box2D.b2BodyDef();
        bd.set_type(Box2D.b2_dynamicBody);
        bd.set_position( new Box2D.b2Vec2(x, y) );

        var shape = new Box2D.b2PolygonShape();
        shape.SetAsBox(width, height);

        var filter = new Box2D.b2Filter();
        filter.set_categoryBits(game.entity_category.crate);
        filter.set_maskBits(game.entity_category.ninja | game.entity_category.crate | game.entity_category.asteroid | game.entity_category.bullet);

        var fd = new Box2D.b2FixtureDef();
        fd.set_shape(shape);
        fd.set_density(m_crates[crate_type].density);
        fd.set_friction(m_crates[crate_type].friction);
        fd.set_restitution(m_crates[crate_type].restitution);
        fd.set_userData(id);
        fd.set_filter(filter);

        var body = this.world.CreateBody(bd);
        body.CreateFixture(fd);
        body.SetLinearVelocity(new Box2D.b2Vec2(px, py));

        var that = this;

        game.crates[id] = {
            body: body,
            crate_type: crate_type,
            alive: true,

            render: function() {
                var pos = this.body.GetPosition();
                var rot = this.body.GetAngle();
                game.pushMatrix();
                    mat4.translate(game.model_view_matrix, [
                        pos.get_x(),
                        pos.get_y(),
                        0.0
                    ]);
                    mat4.rotate(game.model_view_matrix, rot, [0, 0, 1]);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_crates[this.crate_type].pos_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_position_attribute, m_crates[this.crate_type].pos_buffer.itemSize, gl.FLOAT, false, 0, 0);

                    gl.bindBuffer(gl.ARRAY_BUFFER, m_crates[this.crate_type].col_buffer);
                    gl.vertexAttribPointer(game.color_shader_program.vertex_color_attribute, m_crates[this.crate_type].col_buffer.itemSize, gl.FLOAT, false, 0, 0);
                    
                    gl.uniformMatrix4fv(game.color_shader_program.perspective_matrix_uniform, false, game.perspective_matrix);
                    gl.uniformMatrix4fv(game.color_shader_program.model_view_matrix_uniform, false, game.model_view_matrix);

                    gl.drawArrays(gl.TRIANGLES, 0, m_crates[this.crate_type].pos_buffer.numItems);
                game.popMatrix();
            },

            update: function() {
                var pos = this.body.GetPosition();
            }
        };

        return id;
    },

    create_particle: function(x, y, px, py, particle_type) {
        var id = game.add_user_data({ type: 'particle' });
        
        game.particles[id] = {
            x:  x,
            y:  y,
            px: px,
            py: py,
            type: particle_type,
            lifetime: m_particles[particle_type].lifetime,
            alive: true,

            update: function() {
                this.x += this.px;
                this.y += this.py;
                this.alive = --this.lifetime > 0;
            },

            render: function() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, particles[this.type].radius, 0, 2*Math.PI);
                ctx.fillStyle = particles[this.type].color,
                ctx.fill();
                ctx.closePath();
            }
        };
    },
    
    step: function() {
        this.world.Step(1 / 60, 10, 10);
        this.iteration++;

        for(var i in this.bullets) {
            var m = this.bullets[i];
            m.update();

            if(! m.alive) {
                this.world.DestroyBody(m.body);
                delete this.bullets[i];
            }
        }

        for(var i in this.crates) {
            var m = this.crates[i];
            m.update();

            if(! this.bounds_check(m.body)) {
                m.alive = false;
            }

            if(! m.alive) {
                this.world.DestroyBody(m.body);
                delete this.crates[i];
            }
        }

        var lastManVictoryCheck = 0; 
        var stockVictoryCheck = 1;
        var guyCount = 0;
        for(var i in this.ninjas) {
            guyCount++;
            var m = this.ninjas[i];
            m.update();

            // I was trying to get this damage watcher integrated into bounds_check, but I couldnt figure out how to use the object properly
            if((! this.bounds_check(m.body)) || (m.damage >= m_ninjas[m.ninja_type].max_damage)) m.alive = false;
            

            
            if(! m.alive && m.respawn_counter == 0) {
                var delayMod = 1;
                
                if (settings.victoryCondition.lastMan){
                    m.deaths++;
                    console.log("ninja death: " + m.deaths);
                    delayMod = m.deaths * (m.deaths / 2);
                }
                
                
                if (settings.victoryCondition.stock){
                    m.stock--;
                    console.log("stock: " + m.stock);
                }
                m.respawn_counter = settings.spawnpoint.ninja_delay * delayMod;
            }
            // && (this.ninjas.length > 1))
            if (settings.victoryCondition.stock &&  m.stock > 1){
                stockVictoryCheck++;
            }
            if (settings.victoryCondition.lastMan && m.alive){
                lastManVictoryCheck++;
            }
        }
        if (settings.victoryCondition.lastMan && (lastManVictoryCheck <= 1) && (guyCount > 1)){
            console.log("LAST MAN VICTORY MET! RESTARTING!");
            this.victory();
        }
        if ((settings.victoryCondition.stock) && (stockVictoryCheck <= 1) && (guyCount > 1)){
            console.log("STOCK VICTORY MET! RESTARTING!");
            this.victory();
        }

        for(var i in this.particles) {
            var m = this.particles[i];
            m.update();

            if(! m.alive) {
                delete this.particles[i];
            }
        }

        if(this.ninja != null) {
            this.ninja.update();
        }

        for(var i=0; i<this.ninja_ais.length; ++i) {
            this.ninja_ais[i].update();
        }
    },
    victory: function(){
        game.RESTART = true;
        // wipe game
        // re-initialize game
        // game.init();
    },
    bounds_check: function(body) {
        if(body.GetPosition().get_x() < game.boundary.left)    return false;
        if(body.GetPosition().get_x() > game.boundary.right)   return false;
        if(body.GetPosition().get_y() > game.boundary.top)     return false;
        if(body.GetPosition().get_y() < game.boundary.bottom)  return false;
        return true;
    },

    render_asteroids: function() {
        gl.uniformMatrix4fv(game.color_shader_program.perspective_matrix_uniform, false, game.perspective_matrix);
        gl.uniformMatrix4fv(game.color_shader_program.model_view_matrix_uniform, false, game.model_view_matrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, game.asteroid_vert_pos_buffer);
        gl.vertexAttribPointer(game.color_shader_program.vertex_position_attribute, game.asteroid_vert_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, game.asteroid_vert_col_buffer);
        gl.vertexAttribPointer(game.color_shader_program.vertex_color_attribute, game.asteroid_vert_col_buffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, game.asteroid_vert_pos_buffer.numItems);
    },

    render: function() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.01, 50.0, game.perspective_matrix);

        mat4.identity(game.model_view_matrix);

        mat4.translate(game.model_view_matrix, [
            (game.game_offset.x + (canvas.width  / 2) - game.mousex) * 0.04,
            (game.game_offset.y + (canvas.height / 2) + game.mousey) * 0.04,
            -50
        ]);

        if(game.camninja != null) {
            var pos = game.camninja.body.GetPosition();
            mat4.translate(game.model_view_matrix, [
                -pos.get_x(),
                -pos.get_y() - (canvas.height * 0.04),
                0.0
            ]);
        }



        gl.useProgram(game.color_shader_program);
        game.render_asteroids();

        gl.useProgram(game.texture_shader_program);
        for(var i in game.ninjas) {
            game.ninjas[i].render();
        }

        gl.useProgram(game.color_shader_program);
        for(var i in game.crates) {
            game.crates[i].render();
        }

        for(var i in game.bullets) {
            game.bullets[i].render();
        }


        /*
        ctx.save();            
            ctx.translate(game.game_offset.x + canvas.width/2 - game.mousex, game.game_offset.y + canvas.height / 2 - game.mousey);
            ctx.scale(1, -1);                
            ctx.scale(settings.PTM, settings.PTM);

            // disabled 
            //for(var i in game.spawnpoints) {
            //    game.spawnpoints[i].render();
            //}

            for(var i in game.particles) {
                game.particles[i].render();
            }

            game.boundary.render();


        ctx.restore();

        if(game.ninja != null) {
            var hud_height = 50;
            ctx.save();
                ctx.translate(0, canvas.height - hud_height);
                ctx.font      = Math.floor(hud_height * 0.5) + "px Andale Mono";
                ctx.fillStyle = 'rgb(255, 255, 255)';

                if(game.ninja.n.alive) {
                    ctx.fillText(Math.floor(game.ninja.n.damage * 100) + "%", 10, hud_height * 0.9);

                    var gun_text = "";
                    ctx.drawImage(guns[game.ninja.n.gun.type].sprite, 100, hud_height * 0.4);

                    if(game.ninja.n.gun.reloadtime > 0) {
                        gun_text += "reloading (" + game.ninja.n.gun.reloadtime + ")";
                    } else {
                        gun_text += "" + game.ninja.n.gun.ammo + "/" + guns[game.ninja.n.gun.type].ammo;

                        if(game.ninja.n.gun.fireinterval > 0) {
                            gun_text += " (" + game.ninja.n.gun.fireinterval + ")";
                        }
                    }

                    ctx.fillText(gun_text, 200, hud_height * 0.8);

                    ctx.fillText("jetpack: " + Math.floor(Math.max(0, game.ninja.n.jetpack.ammo)) + "/" + m_ninjas[this.ninja_type].jetpack.max_ammo, 700, hud_height * 0.8);

                    if(settings.victoryCondition.stock){
                        ctx.fillText("Stock: " + game.ninja.n.stock, 550, hud_height * 0.8);
                    }

                    ctx.fillText("vx: " + Math.ceil(game.ninja.n.body.GetLinearVelocity().get_x()) + " vy: " + Math.ceil(game.ninja.n.body.GetLinearVelocity().get_y()), 1200, hud_height * 0.8);
                } else {
                    ctx.fillText("respawning in: " + game.ninja.n.respawn_counter, 10, hud_height * 0.8);
                }
            ctx.restore();
        }*/


        window.requestAnimationFrame(game.render);
        meter.tick();
    },

    mousedown: function(e) {
        game.mouseDown[e.button] = 1;
    },

    mouseup: function(e) {
        if(game.in_main_menu) {
            game.main_menu_click();
        }

        --game.mouseDown[e.button];
    },

    mousemove: function(e) {
        var x = event.pageX;
        var y = event.pageY;
        game.mousex = x;
        game.mousey = y;
        game.mouseangle = Math.atan2((canvas.height / 2) - y, x - (canvas.width / 2));
    },

    keydown: function(e) {
        var key = e.keyCode;
        switch(key) {
            case settings.controls.key_up:    game.keyResult |= game.KEY_UP;    break;
            case settings.controls.key_left:  game.keyResult |= game.KEY_LEFT;  break;
            case settings.controls.key_down:  game.keyResult |= game.KEY_DOWN;  break;
            case settings.controls.key_right: game.keyResult |= game.KEY_RIGHT; break;
            case settings.controls.key_toss:  game.keyResult |= game.KEY_TOSS;  break;
        }
    },

    keyup: function(e) {
        var key = e.keyCode;
        switch(key) {
            case settings.controls.key_up:    game.keyResult ^= game.KEY_UP;    break;
            case settings.controls.key_left:  game.keyResult ^= game.KEY_LEFT;  break;
            case settings.controls.key_down:  game.keyResult ^= game.KEY_DOWN;  break;
            case settings.controls.key_right: game.keyResult ^= game.KEY_RIGHT; break;
            case settings.controls.key_toss:  game.keyResult ^= game.KEY_TOSS;  break;
        }
    },

    main_menu_click: function() {
        if(game.ninja == null) {
            var id = game.create_ninja();
            var s = game.random_spawn_point();
            game.ninjas[id].spawn(s.x, s.y);
            game.ninja = game.ninja_human_controller(game.ninjas[id]);
            game.camninja = game.ninjas[id];
        }

        $('#overlay').fadeOut(100);
    }

};

game.init();
setInterval(function() {
    game.step();
}, 1000.0 / 60);
window.requestAnimationFrame(game.render);

