// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

(function() {
    var canvas    = document.getElementById("canvas");
    var ctx       = canvas.getContext("2d");
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    function dist(x1, y1, x2, y2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function map(value, istart, istop, ostart, ostop) {
        return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
    }

    function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

    var game = {
        world: new Box2D.b2World(new Box2D.b2Vec2(0, -15), false),
        game_offset: { x: 0, y: 0 }, /* translation of game world render */
        PTM: 16, /* pixels to meters */
        listener: new Box2D.JSContactListener(),
        user_data: {},
        sprites: {},
        asteroids: {},
        bullets: {},
        crates: {},
        ninjas: {},
        particles: {},
        iteration: 0,
        asteroids_created: 0,
        mouseDown: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ninja: null,
        mouseangle: 0.0,
        mousex: 0,
        mousey: 0,
        KEY_UP   :   1,
        KEY_RIGHT:   2,
        KEY_DOWN :   4,
        KEY_LEFT :   8,
        keyResult: 0,

        init: function() {
            canvas.onmousedown = this.mousedown;
            canvas.onmouseup   = this.mouseup;
            canvas.onmousemove = this.mousemove;
            document.oncontextmenu = this.rightclick;
            document.onkeydown   = this.keydown;
            document.onkeyup     = this.keyup;

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

                var mA = bA.GetMass();
                var mB = bB.GetMass();

                var vxA = bA.GetLinearVelocity().get_x();
                var vyA = bA.GetLinearVelocity().get_y();
                var vxB = bB.GetLinearVelocity().get_x();
                var vyB = bB.GetLinearVelocity().get_y();

                var vdx = vxA - vxB;
                var vdy = vyA - vyB;

                if(tA == 'ninja' && tB == 'ninja') {
                    var f = 20 + Math.abs(vdx) + Math.abs(vdy);
                    var dA = game.ninjas[udA].damage;
                    var dB = game.ninjas[udA].damage;
                    bA.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleAB) * f * dA, Math.sin(angleAB) * f * dA));
                    bB.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleBA) * f * dB, Math.sin(angleBA) * f * dB));
                }


                if(tA == 'ninja' && tB == 'bullet') {
                    var gd = guns[game.bullets[udB].gun_type].damage;
                    var f = (Math.abs(vdx) + Math.abs(vdy)) * gd * mA;
                    var d = game.ninjas[udA].damage;
                    bA.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleBA) * f * d, Math.sin(angleBA) * f * d));

                    game.ninjas[udA].damage += f/100.0;
                    game.bullets[udB].alive = false;
                }

                if(tA == 'bullet' && tB == 'ninja') {
                    var gd = guns[game.bullets[udA].gun_type].damage;
                    var f = (Math.abs(vdx) + Math.abs(vdy)) * gd * mA;
                    var d = game.ninjas[udB].damage;
                    bB.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(angleAB) * f * d, Math.sin(angleAB) * f * d));

                    game.ninjas[udB].damage += f/100.0;
                    game.bullets[udA].alive = false;
                }
            };

            this.listener.EndContact = function(contactPtr) {
                var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
                var udA = contact.GetFixtureA().GetUserData();
                var udB = contact.GetFixtureB().GetUserData();

            };

            // Empty implementations for unused methods.
            this.listener.PreSolve   = function() {};
            this.listener.PostSolve  = function() {};

            this.world.SetContactListener(this.listener);

            this.sprites.ninja = new Image();
            this.sprites.ninja.src = 'ninja.png';
            for(var i=0; i<50; i++) {
                var x = i*10 + (Math.random() * 10);
                var y = -60+(Math.random() * 60);
                this.create_asteroid(x, y);
                this.create_crate(x, y+10, 0);
            }
        },

        add_user_data: function(data) {
            var id = Math.floor(Math.random() * Math.pow(2, 31));
            game.user_data[id] = data;
            return id;
        },

        create_bullet: function(x, y, px, py, gun_type) {
            var id = game.add_user_data({ type: 'bullet', gun_type: gun_type });
            var radius = guns[gun_type].radius;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );

            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(guns[gun_type].density);
            fd.set_friction(guns[gun_type].friction);
            fd.set_restitution(guns[gun_type].restitution);
            fd.set_userData(id);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);
            body.SetLinearVelocity(new Box2D.b2Vec2(px, py));

            var that = this;

            game.bullets[id] = {
                body: body,
                radius: radius,
                lifetime: guns[gun_type].lifetime,
                gun_type: gun_type,
                alive: true,

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.beginPath();
                    ctx.arc(pos.get_x(), pos.get_y(), this.radius, 0, 2*Math.PI);
                    ctx.fillStyle = "rgb(30, 150, 250)";
                    ctx.fill();
                    ctx.closePath();
                },

                update: function() {
                    this.alive = --this.lifetime > 0;
                }
            };
        },

        create_ninja: function(x, y) {
            var id = game.add_user_data({ type: 'ninja' });
            var radius = 0.75;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );
            bd.set_fixedRotation(true);

            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(1.0);
            fd.set_friction(0.1);
            fd.set_restitution(0.2);
            fd.set_userData(id);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);

            var that = this;
            var gun_type = 0;

            game.ninjas[id] = {
                body: body,
                radius: radius,
                alive: true,
                damage: 0,
                facing_dir: -1,
                gun: {
                    type: gun_type,
                    ammo:         guns[gun_type].ammo,
                    fireinterval: guns[gun_type].fireinterval,
                    reloadtime:   0
                },

                render: function() {
                    var bpos = this.body.GetPosition();

                    ctx.save();
                        ctx.translate(bpos.get_x(), bpos.get_y());
                        ctx.scale(this.facing_dir, -1);
                        ctx.drawImage(game.sprites.ninja,
                            -this.radius, -this.radius,
                            this.radius*2,
                            this.radius*2
                        );
                    ctx.restore();
                },

                update: function() {
                    if(this.gun.fireinterval > 0) {
                        this.gun.fireinterval--;
                    }
                    if(this.gun.reloadtime > 0) {
                        this.gun.reloadtime--;
                    }

                },

                move: function(dir) {
                    var strength = 28;
                    var max_speed = 15;
                    if(Math.abs(this.body.GetLinearVelocity().get_x()) < max_speed || sign(dir) != sign(this.body.GetLinearVelocity().get_x())) {
                        this.body.ApplyForceToCenter(new Box2D.b2Vec2(strength * dir, 0.0));
                    }
                },

                shoot: function(angle) {
                    if(this.gun.fireinterval != 0 || this.gun.reloadtime != 0) {
                        return;
                    }

                    if(this.gun.ammo == 0) {
                        this.gun.ammo = guns[this.gun.type].ammo;
                        this.gun.reloadtime = guns[this.gun.type].reloadtime;
                        return;
                    }

                    var strength = guns[this.gun.type].strength;
                    angle += guns[this.gun.type].accuracy * noise.simplex2(game.iteration, 0);

                    game.create_bullet(
                        this.body.GetPosition().get_x() + (Math.cos(angle) * this.radius * 2),
                        this.body.GetPosition().get_y() + (Math.sin(angle) * this.radius * 2),
                        this.body.GetLinearVelocity().get_x() + (Math.cos(angle) * strength),
                        this.body.GetLinearVelocity().get_y() + (Math.sin(angle) * strength),
                        this.gun.type
                    );

                    var bink_strength = guns[this.gun.type].selfbink;
                    var bink_angle = angle+Math.PI;
                    this.body.ApplyLinearImpulse(new Box2D.b2Vec2(Math.cos(bink_angle) * bink_strength, Math.sin(bink_angle) * bink_strength));


                    this.gun.fireinterval = guns[this.gun.type].fireinterval;
                    this.gun.ammo--;
                },

                jump: function() {
                    //todo fix contact detect
                    //maybe just need to loop thru clist?
                    var strength = 15;
                    var contact = this.body.GetContactList().get_contact().IsTouching();
                    if(contact) {
                        this.body.ApplyLinearImpulse(new Box2D.b2Vec2(0.0, strength));
                        this.body.SetAngularVelocity(0.0);
                    }
                },

                jetpack: function() {
                    var strength = 1;
                    var max_speed = 15;
                    if(this.body.GetLinearVelocity().get_y() < max_speed) {
                        this.body.ApplyLinearImpulse(new Box2D.b2Vec2(0.0, strength));
                        game.create_particle(this.body.GetPosition().get_x(), this.body.GetPosition().get_y(), (-0.5 + Math.random()) / game.PTM, -0.1 + (-0.5 + Math.random()) / game.PTM, 0);
                    }
                }
            };

            return id;
        },

        ninja_human_controller: function(ninja) {
            return {
                n: ninja,
                update: function() {
                    this.n.facing_dir = (game.mousex < window.innerWidth / 2) ? 1 : -1;

                    if(game.mouseDown[0] ) {
                        var angle = Math.atan2((canvas.height / 2) - game.mousey, game.mousex - canvas.width / 2);
                        this.n.shoot(angle);
                    }

                    if(game.mouseDown[2]) {
                       this.n.jetpack(); 
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

            var verts = [];
            for(var i=0; i<edges; i++) {
                var a = Math.PI * 2 / edges * i;
                var ax = Math.cos(a);
                var ay = Math.sin(a);

                var nx = 0.5 + Math.abs(noise.simplex2(ax / 1.613 + (x / 13.2) + (y / 82.45), ay / 1.73  + (x / 13.2) + (y / 82.45)));
                var ny = 0.5 + Math.abs(noise.simplex2(ay / 1.613 + (y / 13.2) + (x / 82.45), ax / 1.73  + (y / 13.2) + (x / 82.45)));

                verts.push( new Box2D.b2Vec2(
                    xtoy * (ax * (size / 2 + nx) * size / 2),
                    ytox * ay *  (size / 2 + ny) * size / 2
                ) );
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

                var fd = new Box2D.b2FixtureDef();
                fd.set_shape(polygonShape);
                fd.set_density(1.0);
                fd.set_friction(1.0);
                fd.set_restitution(0.1);
                fd.set_userData(id);
                
                body.CreateFixture(fd);
            }

            game.asteroids[id] = {
                body: body,
                verts: verts,
                render_center: render_center,
                alive: true,
                color: "#DC3CBF",

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.fillStyle = this.color;
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 0.075;
                    
                    for(var i=0; i<verts.length-1; i++) {
                        ctx.beginPath();
                        ctx.moveTo(pos.get_x() + render_center.x, 
                                   pos.get_y() + render_center.y);
                        ctx.lineTo(pos.get_x() + this.verts[i].get_x(), 
                                   pos.get_y() + this.verts[i].get_y());
                        ctx.lineTo(pos.get_x() + this.verts[i+1].get_x(), 
                                   pos.get_y() + this.verts[i+1].get_y());
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }

                    ctx.beginPath();
                    ctx.moveTo(pos.get_x() + render_center.x, 
                               pos.get_y() + render_center.y);
                    ctx.lineTo(pos.get_x() + this.verts[this.verts.length-1].get_x(), 
                               pos.get_y() + this.verts[this.verts.length-1].get_y());
                    ctx.lineTo(pos.get_x() + this.verts[0].get_x(), 
                               pos.get_y() + this.verts[0].get_y());
                    ctx.closePath();

                    ctx.fill();
                }
            };

            return id;
        },

        create_crate: function(x, y, crate_type) {
            var id = game.add_user_data({ type: 'crate', crate_type: crate_type });
            var width  = crates[crate_type].width;
            var height = crates[crate_type].height;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );

            var shape = new Box2D.b2PolygonShape();
            shape.SetAsBox(width, height);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(shape);
            fd.set_density(crates[crate_type].density);
            fd.set_friction(crates[crate_type].friction);
            fd.set_restitution(crates[crate_type].restitution);
            fd.set_userData(id);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);

            var that = this;

            game.crates[id] = {
                body: body,
                crate: {
                    type: crate_type,
                    width: width,
                    height: height,
                    color: crates[crate_type].color
                },
                alive: true,

                render: function() {
                    var pos = this.body.GetPosition();
                    var rot = this.body.GetAngle();
                    ctx.save();
                        ctx.translate(pos.get_x(), pos.get_y());
                        ctx.rotate(rot);
                        ctx.fillStyle = this.crate.color;
                        ctx.fillRect(-this.crate.width, -this.crate.height, this.crate.width*2, this.crate.height*2);
                    ctx.restore();
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
                lifetime: particles[particle_type].lifetime,
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

                if(! m.alive) {
                    this.world.DestroyBody(m.body);
                    delete this.crates[i];
                }
            }

            for(var i in this.ninjas) {
                var m = this.ninjas[i];
                m.update();

                if(! m.alive) {
                    this.world.DestroyBody(m.body);
                    delete this.ninjas[i];
                }
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

            if(this.iteration % 30 == 0) {
                this.bounds_check();
            }
        },

        bounds_check: function() {
            /*
            for(var i=0; i<this.crates.length; ++i) {
                if(this.crates[i].body.GetPosition().get_x() + canvas.width < this.game_offset.x) {
                    this.crates[i].alive = false;
                }
            }

            for(var i=0; i<this.bullets.length; ++i) {
                if(this.bullets[i].body.GetPosition().get_x() + canvas.width < this.game_offset.x) {
                    this.bullets[i].alive = false;
                }
            }

            var destroyed_asteroids = 0;
            for(var i=0; i<this.asteroids.length; ++i) {
                if(this.asteroids[i].body.GetPosition().get_x() + canvas.width < this.game_offset.x) {
                    //this.asteroids[i].alive = false;
                    destroyed_asteroids++;
                }
            }

            for(var i=0; i<destroyed_asteroids; i++) {
                this.asteroids.push(this.create_asteroid((-this.game_offset.x) - canvas.width/2 + (Math.random() * 10), -10+(Math.random() * 10)));
            }
            */
        },

        render: function() {
            ctx.fillStyle = 'rgb(20, 20, 20)';
            ctx.fillRect( 0, 0, canvas.width, canvas.height );
            //this.game_offset.x-=0.5;
            
            ctx.save();            
                ctx.translate(this.game_offset.x + canvas.width/2 - game.mousex, this.game_offset.y + canvas.height / 2 - game.mousey);
                if(this.ninja != null) {
                    var pos = this.ninja.n.body.GetPosition();
                    ctx.translate((-pos.get_x()*this.PTM) + (canvas.width / 2), (pos.get_y()*this.PTM) + canvas.height / 2);
                }
                ctx.scale(1, -1);                
                ctx.scale(this.PTM, this.PTM);

                for(var i in this.particles) {
                    this.particles[i].render();
                }

                for(var i in this.crates) {
                    this.crates[i].render();
                }

                for(var i in this.bullets) {
                    this.bullets[i].render();
                }

                for(var i in this.asteroids) {
                    this.asteroids[i].render();
                }

                for(var i in this.ninjas) {
                    this.ninjas[i].render();
                }
            ctx.restore();

            if(this.ninja != null) {
                var hud_height = 50;
                ctx.save();
                    ctx.translate(0, canvas.height - hud_height);
                    ctx.font = "48px serif";
                    ctx.fillStyle = 'rgb(255, 255, 255)';
                    ctx.fillText(Math.floor(this.ninja.n.damage * 100) + "%", 10, hud_height * 0.9);
                ctx.restore();
            }
        },

        mousedown: function(e) {
            var x = event.pageX;
            var y = event.pageY;
            game.mouseDown[e.button] = 1;

            if(game.ninja == null) {
                var id = game.create_ninja(x / game.PTM, -(y / game.PTM));
                game.ninja = game.ninja_human_controller(game.ninjas[id]);

                for(var i=0; i<10; ++i) {
                    game.create_ninja(x / game.PTM + 3*i, -(y / game.PTM));
                }
            }
        },

        mouseup: function(e) {
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
                case 87: game.keyResult |= game.KEY_UP; break;
                case 65: game.keyResult |= game.KEY_LEFT; break;
                case 83: game.keyResult |= game.KEY_DOWN; break;
                case 68: game.keyResult |= game.KEY_RIGHT; break;
            }
        },

        keyup: function(e) {
            var key = e.keyCode;
            switch(key) {
                case 87: game.keyResult ^= game.KEY_UP; break;
                case 65: game.keyResult ^= game.KEY_LEFT; break;
                case 83: game.keyResult ^= game.KEY_DOWN; break;
                case 68: game.keyResult ^= game.KEY_RIGHT; break;
            }
        }

    };

    game.init();
    setInterval(function() {
        game.step();
        game.render();
    }, 1000.0 / 60);
})();
