(function() {
    var canvas    = document.getElementById("canvas");
    var ctx       = canvas.getContext("2d");
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;



    var game = {
        world: new Box2D.b2World(new Box2D.b2Vec2(0, -10), false),
        draw_offset: { x: 0, y: 0 }, /* translation of game world render */
        PTM: 32, /* pixels to meters */
        asteroids: [],
        balls    : [],
        coins    : [],

        init: function() {
            {
                this.balls.push(this.create_ball(1, -1));
                this.balls.push(this.create_ball(3, -1));
                this.balls.push(this.create_ball(5, -1));
                this.balls.push(this.create_ball(7, -1));
                this.balls.push(this.create_ball(9, -1));
                this.balls.push(this.create_ball(11, -1));
                this.balls.push(this.create_ball(13, -1));

                this.asteroids.push(this.create_asteroid(7, -14));
            }
            console.log(this.balls[0].body);
            console.log(this.asteroids[0].body.GetPosition());
        },

        create_ball: function(x, y) {
            var radius = 0.4;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(x, y) );


            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(1.0);
            fd.set_friction(0.9);
            fd.set_restitution(0.99);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);

            return {
                body: body,
                radius: radius,

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.beginPath();
                    ctx.arc(pos.get_x(), pos.get_y(), this.radius, 0, 2*Math.PI);
                    ctx.fillStyle = "rgba(30, 250, 150, 1)";
                    ctx.fill();
                    ctx.closePath();
                }
            };
        },

        create_asteroid: function(x, y) {
            var size = 3.5;
            var edges = 10 + (2 * Math.floor(Math.random()*10));

            var verts = [];
            for(var i=0; i<edges; i++) {
                var ax = Math.cos(Math.PI * 2 / edges * i);
                var ay = Math.sin(Math.PI * 2 / edges * i);

                var nx = 0.5 + Math.abs(noise.simplex2(ax / 1.613 + (x / 13.2) + (y / 82.45), ay / 1.73  + (x / 13.2) + (y / 82.45)));
                var ny = 0.5 + Math.abs(noise.simplex2(ay / 1.613 + (y / 13.2) + (x / 82.45), ax / 1.73  + (y / 13.2) + (x / 82.45)));

                verts.push( new Box2D.b2Vec2(
                    ax * (size / 2 + nx) * size / 2,
                    ay *  (size / 2 + ny) * size / 2
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


            for(var i=0; i<verts.length-1; i++) {
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
                fd.set_friction(0.9);
                fd.set_restitution(0.99);
                
                body.CreateFixture(fd);
            }

            return {
                body: body,
                verts: verts,
                render_center: render_center,

                render: function() {
                    var pos = this.body.GetPosition();
                    ctx.fillStyle = "rgba(30, 250, 150, 0.5)";
                    
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
        
        create_coin: function() {
            return {

            };
        },

        step: function() {
            this.world.Step(1 / 60, 10, 10);
            this.world.ClearForces();
        },

        render: function() {
            ctx.fillStyle = 'rgb(0,0,0)';
            ctx.fillRect( 0, 0, canvas.width, canvas.height );
            
            ctx.save();            
                ctx.translate(this.draw_offset.x, this.draw_offset.y);
                ctx.scale(1, -1);                
                ctx.scale(this.PTM, this.PTM);
                ctx.lineWidth /= this.PTM;                
                ctx.fillStyle = 'rgb(255,255,0)';

                for(var i=0; i<this.balls.length; ++i) {
                    this.balls[i].render();
                }

                for(var i=0; i<this.asteroids.length; ++i) {
                    this.asteroids[i].render();
                }

                
            ctx.restore();
        }
    };

    game.init();
    setInterval(function() {
        game.step();
        game.render();
    }, 1000.0 / 60);
})();