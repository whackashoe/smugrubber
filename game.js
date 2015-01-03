(function() {
    var canvas    = document.getElementById("canvas");
    var ctx       = canvas.getContext("2d");
    canvas.width  = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    var mouseIsDown = false;

    var game = {
        world: new Box2D.b2World(new Box2D.b2Vec2(0, -10), false),
        draw_offset: { x: 0, y: 0 }, /* translation of game world render */
        PTM: 32, /* pixels to meters */
        asteroids: [],
        balls    : [],
        coins    : [],

        init: function() {
            {
                this.balls.push(this.create_ball());
            }
            console.log(this.balls[0].body.GetPosition());
        },

        create_floor: function() {
            //Jett says we don't need a floor
        },

        create_ball: function(x, y) {
            var radius = 0.4;

            var bd = new Box2D.b2BodyDef();
            bd.set_type(Box2D.b2_dynamicBody);
            bd.set_position( new Box2D.b2Vec2(10, -10) );
            

            var circleShape = new Box2D.b2CircleShape();
            circleShape.set_m_radius(radius);

            var fd = new Box2D.b2FixtureDef();
            fd.set_shape(circleShape);
            fd.set_density(1.0);
            fd.set_friction(0.9);

            var body = this.world.CreateBody(bd);
            body.CreateFixture(fd);

            return {
                body: body,
                radius: radius,
            };
        },

        create_asteroid: function() {
            return {

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

        user_input: canvas.onmousedown=function(e) {
            {
                var x = event.pageX;
                var y = event.pageY;
                console.log("mouse at " + x + "," + y);
                
                game.balls.push(game.create_ball(x,y));
            }
            


            mouseIsDown = true;
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
                    var pos = this.balls[i].body.GetPosition();
                    ctx.beginPath();
                    ctx.arc(pos.get_x(), pos.get_y(), this.balls[i].radius, 0, 2*Math.PI);
                    ctx.fillStyle = "rgba(30, 250, 150, 1)";
                    ctx.fill();
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