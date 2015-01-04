
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
        world: new Box2D.b2World(new Box2D.b2Vec2(0, -10), false),
        game_offset: { x: 0, y: 0 }, /* translation of game world render */
        PTM: 16, /* pixels to meters */
        asteroids: [],
        balls    : [],
        coins    : [],
        collected_coins: 0,
        iteration: 0,
        asteroids_created: 0,
        mouseIsDown: false,
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
            canvas.onmousemove = this.mousemove;
            document.oncontextmenu = this.rightclick;
            document.onkeydown   = this.keydown;
            document.onkeyup     = this.keyup;


            for(var i=0; i<10; i++) {
                var x = i*13 + (Math.random() * 10);
                var y = -60+(Math.random() * 60);
                this.asteroids.push(this.create_asteroid(x, y));
            }
        },

        create_ball: function(x, y, px, py) {
            var radius = 1.0;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );

            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(1.0);
            fd.set_friction(1.0);
            fd.set_restitution(1.0);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);
            body.SetLinearVelocity( new Box2D.b2Vec2(px, py) )

            var that = this;

            return {
                body: body,
                radius: radius,
                alive: true,

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.beginPath();
                    ctx.arc(pos.get_x(), pos.get_y(), this.radius, 0, 2*Math.PI);
                    ctx.fillStyle = "rgba(30, 150, 250, 1)";
                    ctx.fill();
                    ctx.closePath();
                },

                update: function() {
                    var pos = this.body.GetPosition();
                    //check collisions with coins
                    for(var i=0; i<that.coins.length; ++i) {
                        if(dist(pos.get_x(), pos.get_y(), that.coins[i].x, that.coins[i].y) < this.radius * 1.25) { //buffer for easiness (1.25)
                            that.coins[i].alive = false;
                            that.collected_coins++;
                        }
                    }
                }
            };
        },

        create_ninja: function(x, y) {
            var radius = 0.25;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );

            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(1.0);
            fd.set_friction(1.0);
            fd.set_restitution(0.1);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);

            var that = this;

            return {
                body: body,
                radius: radius,
                alive: true,
                angle: 0.0,
                grapple: {
                    body: null,
                    joint: null,
                    attached: false,
                    shooting: false,
                    radius: 0.1,
                },

                render: function() {
                    var bpos = this.body.GetPosition();
                    
                    if(this.grapple.body != null) {
                        var pos = this.grapple.body.GetPosition();
                        ctx.beginPath();
                        ctx.arc(pos.get_x(), pos.get_y(), this.grapple.radius, 0, 2*Math.PI);
                        ctx.fillStyle = "rgba(255, 120, 50, 1)";
                        ctx.fill();
                        ctx.closePath();

                        ctx.strokeStyle = "rgba(255,255,255,0.5)";

                        ctx.beginPath();
                        ctx.moveTo(bpos.get_x(), bpos.get_y());
                        ctx.lineTo(pos.get_x(), pos.get_y());
                        ctx.closePath();
                        ctx.stroke();
                    }

                    ctx.beginPath();
                    ctx.arc(bpos.get_x(), bpos.get_y(), this.radius, 0, 2*Math.PI);
                    ctx.fillStyle = "rgba(255, 120, 50, 1)";
                    ctx.fill();
                    ctx.closePath();
                },

                update: function() {
                    if(this.grapple.body != null) {
                        if(this.grapple.shooting) {
                            var touching = this.grapple.body.GetContactList().get_contact().IsTouching();
                            if(touching) {
                                this.grapple.attached = true;
                                this.grapple.shooting = false;
                                this.grapple.body.SetType(Box2D.b2_staticBody);

                                var jointDef = new Box2D.b2DistanceJointDef;
                                jointDef.set_bodyA(this.grapple.body);
                                jointDef.set_bodyB(this.body);
                                console.log(jointDef);
                                jointDef.set_frequencyHz(0.2);
                                jointDef.set_dampingRatio(0.3);
                                this.grapple.joint = that.world.CreateJoint(jointDef);
                            }
                        }
                    }

                    var pos = this.body.GetPosition();
                    //check collisions with coins
                    for(var i=0; i<that.coins.length; ++i) {
                        if(dist(pos.get_x(), pos.get_y(), that.coins[i].x, that.coins[i].y) < this.radius * 1.25) { //buffer for easiness (1.25)
                            that.coins[i].alive = false;
                            that.collected_coins++;
                        }
                    }

                    //this.body.ApplyForceToCenter( new Box2D.b2Vec2(Math.cos(that.mouseangle) * force, Math.sin(that.mouseangle) * force) );
                    /*if(this.angle < Math.PI / 2 && this.angle > -Math.PI / 2) {
                        this.body.AddForce( new Box2D.b2Vec2() )
                        //pointing right
                    }*/
                    switch(game.keyResult) {
                        case game.KEY_UP:
                            this.jump();
                            break;
                        case game.KEY_LEFT:
                            this.move(-1);
                            break;
                        case game.KEY_RIGHT:
                            this.move(1);
                            break;
                        case game.KEY_UP|game.KEY_LEFT:
                            this.jump();
                            this.move(-1);
                            break;
                        case game.KEY_UP|game.KEY_RIGHT:
                            this.jump();
                            this.move(1);
                            break;
                    }
                },

                move: function(dir) {
                    var strength = 4;
                    var max_speed = 8;
                    if(Math.abs(this.body.GetLinearVelocity().get_x()) < max_speed || sign(dir) != sign(this.body.GetLinearVelocity().get_x())) {
                        this.body.ApplyForceToCenter(new Box2D.b2Vec2(strength * dir, 0.0));
                    }
                },

                jump: function() {
                    /*
                    //todo fix contact detect
                    //maybe just need to loop thru clist?
                    var strength = 2;
                    var contact = this.body.GetContactList().get_contact().IsTouching();
                    if(contact) {
                        this.body.ApplyLinearImpulse(new Box2D.b2Vec2(0.0, strength));
                        this.body.SetAngularVelocity(0.0);
                    }*/
                },

                shoot_grapple: function() {
                    if(this.grapple.joint != null) {
                        that.world.DestroyJoint(this.grapple.joint);
                        this.grapple.joint = null;
                    }

                    if(this.grapple.body != null) {
                        that.world.DestroyBody(this.grapple.body);
                        this.grapple.body = null;
                    }

                    if(this.grapple.shooting || this.grapple.attached) {
                        this.grapple.shooting = false;
                        this.grapple.attached = false;

                        return;
                    }

                    this.grapple.shooting = true;

                    var strength = map(dist(game.mousex, game.mousey, canvas.width/2, canvas.height/2), 0, Math.max(canvas.width/2, canvas.height/2), 10, 30);
                    var x  = this.body.GetPosition().get_x() + (Math.cos(that.mouseangle) * this.radius * 4);
                    var y  = this.body.GetPosition().get_y() + (Math.sin(that.mouseangle) * this.radius * 4);
                    var px = Math.cos(that.mouseangle) * strength;
                    var py = Math.sin(that.mouseangle) * strength;



                    var bd = new Box2D.b2BodyDef();
                    bd.set_type(Box2D.b2_dynamicBody);
                    bd.set_position( new Box2D.b2Vec2(x, y) );

                    var circleShape = new Box2D.b2CircleShape();
                    circleShape.set_m_radius(this.grapple.radius);

                    var fd = new Box2D.b2FixtureDef();
                    fd.set_shape(circleShape);
                    fd.set_density(1.0);
                    fd.set_friction(1.0);
                    fd.set_restitution(0.0);

                    this.grapple.body = that.world.CreateBody(bd);
                    this.grapple.body.CreateFixture(fd);
                    this.grapple.body.SetLinearVelocity( new Box2D.b2Vec2(px, py) );
                }
            };
        },

        create_asteroid: function(x, y) {
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

                if(a < Math.PI) {
                    this.coins.push(this.create_coin(
                        x + (ax * (size/2 + nx) * size / 1.5),
                        y + (ay *  (size/2 + ny) * size/1.5)
                    ));
                

                    if(Math.random() * 100 < 50) {
                        this.coins.push(this.create_coin(
                            x + (ax * (size/2 + nx) * size),
                            y + (ay *  (size/2 + ny) * size)
                        ));
                    }
                }

                if(Math.random() * 100 < 10) {
                    this.coins.push(this.create_coin(
                        x + (ax * (size/2 + nx) * size * 1.25),
                        y + (ay *  (size/2 + ny) * size * 1.25)
                    ));
                }
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
                
                body.CreateFixture(fd);
            }

            return {
                body: body,
                verts: verts,
                render_center: render_center,
                alive: true,
                color: "#DC3CBF",

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.fillStyle = this.color;
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 0.05;
                    
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
        },
        
        create_coin: function(x, y) {
            return {
                x: x,
                y: y, 
                radius: 0.2,
                alive: true,

                render: function() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
                    ctx.fillStyle = "#DDC126";
                    ctx.fill();
                    ctx.closePath();
                }
            };
        },

        step: function() {
            this.world.Step(1 / 60, 10, 10);
            this.world.ClearForces();
            this.iteration++;

            for(var i=0; i<this.balls.length; ++i) {
                this.balls[i].update();

                if(! this.balls[i].alive) {
                    this.world.DestroyBody(this.balls[i].body);
                    this.balls.remove(i);
                }
            }

            for(var i=0; i<this.coins.length; ++i) {
                this.coins[i].render();

                if(! this.coins[i].alive) {
                    this.coins.remove(i);
                }
            }

            for(var i=0; i<this.asteroids.length; ++i) {
                this.asteroids[i].render();

                if(! this.asteroids[i].alive) {
                    this.world.DestroyBody(this.asteroids[i].body);
                    this.asteroids.remove(i);
                }
            }

            if(this.ninja != null) this.ninja.update();

            if(this.iteration % 30 == 0) {
                this.bounds_check();
            }
        },

        bounds_check: function() {
            for(var i=0; i<this.balls.length; ++i) {
                if(this.balls[i].body.GetPosition().get_x() + canvas.width < this.game_offset.x) {
                    this.balls[i].alive = false;
                }
            }

            for(var i=0; i<this.coins.length; ++i) {
                if(this.coins[i].x + canvas.width + canvas.width < this.game_offset.x) {
                    this.coins[i].alive = false;
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
                console.log(this.asteroids_created);
                this.asteroids.push(this.create_asteroid((-this.game_offset.x) - canvas.width/2 + (Math.random() * 10), -10+(Math.random() * 10)));
            }
        },

        render: function() {
            ctx.fillStyle = 'rgba(20,20,20, 0.5)';
            ctx.fillRect( 0, 0, canvas.width, canvas.height );
            //this.game_offset.x--;
            
            ctx.save();            
                ctx.translate(this.game_offset.x, this.game_offset.y);
                if(this.ninja != null) {
                    var pos = this.ninja.body.GetPosition();
                    ctx.translate((-pos.get_x()*this.PTM) + (canvas.width / 2), (pos.get_y()*this.PTM) + canvas.height / 2);
                }
                ctx.scale(1, -1);                
                ctx.scale(this.PTM, this.PTM);
                ctx.strokeStyle = "rgb(255, 255, 255, 0.0)";
                ctx.fillStyle = 'rgb(255,255,0)';

                for(var i=0; i<this.balls.length; ++i) {
                    this.balls[i].render();
                }

                for(var i=0; i<this.coins.length; ++i) {
                    this.coins[i].render();
                }

                for(var i=0; i<this.asteroids.length; ++i) {
                    this.asteroids[i].render();
                }

                if(this.ninja != null) this.ninja.render();

                //draw HUD
                /*ctx.lineWidth = 0.5;
                ctx.strokeStyle = "rgba(255,255,255,0.5)";

                ctx.beginPath();
                ctx.moveTo(canvas.width / this.PTM / 2, -(canvas.height / this.PTM));
                ctx.lineTo((canvas.width / this.PTM / 2), -(canvas.height / this.PTM)+1);
                ctx.closePath();
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(canvas.width / this.PTM / 2, -(canvas.height / this.PTM)+1);
                ctx.lineTo((Math.cos(this.mouseangle) + Math.cos(Math.PI * 0.2)) * 5 + (canvas.width / this.PTM / 2), -(canvas.height / this.PTM) + (Math.sin(this.mouseangle) * 5));
                ctx.closePath();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(canvas.width / this.PTM / 2, -(canvas.height / this.PTM)+1);
                ctx.lineTo((Math.cos(this.mouseangle) + Math.cos(Math.PI * 0.8)) * 5 + (canvas.width / this.PTM / 2), -(canvas.height / this.PTM)+ (Math.sin(this.mouseangle) * 5));
                ctx.closePath();
                ctx.stroke();*/
                
            ctx.restore();
        },

        mousedown: function(e) {
            var x = event.pageX;
            var y = event.pageY;
            
            var angle = Math.atan2((canvas.height) - y, x - (canvas.width / 2));
            var strength = map(y, 0, canvas.height, 40, 15);

            //game.shoot(angle, strength);

            mouseIsDown = true;

            if(game.ninja == null) {
                game.ninja = game.create_ninja(x / game.PTM, -(y / game.PTM));
            } else {
                game.ninja.shoot_grapple();
            }
        },

        mousemove: function(e) {
            var x = event.pageX;
            var y = event.pageY;
            game.mousex = x;
            game.mousey = y;
            game.mouseangle = Math.atan2((canvas.height / 2) - y, x - (canvas.width / 2));
        },

        rightclick: function(e) {
            console.log("right click");
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
        },

        shoot: function(angle, strength) {
            this.balls.push(game.create_ball(
                -(game.game_offset.x / game.PTM) + (canvas.width/game.PTM/2),
                -(canvas.height/game.PTM), 
                Math.cos(angle)*strength,
                Math.sin(angle)*strength)
            );
        }
    };

    game.init();
    setInterval(function() {
        game.step();
        game.render();
    }, 1000.0 / 60);
})();