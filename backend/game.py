import tank
import math
import projectile

def ground_y(x):
    return 500 + math.sin(x / 100) * 30

class Game:
    def __init__ (self):
        self.GameEnd = False
        self.x1 = 100
        self.x2 = 800
        self.T0 = tank.Tank(self.x1, ground_y(self.x1))
        self.T1 = tank.Tank(self.x2, ground_y(self.x2))
        self.currentPlayer = 0
        self.winner = None
        self.shot = None
        self.barrel_angles = [30, 30]
    def switch_turn(self):
        if self.currentPlayer == 0:
            self.T0.repair()
        else:
            self.T1.repair()
        self.currentPlayer = 1 - self.currentPlayer
        next_tank = self.T0 if self.currentPlayer == 0 else self.T1
        next_tank.start_turn()
        
    def check_winner(self):
        if self.T0.hp == 0:
            self.GameEnd = True
            return 1
        if self.T1.hp == 0:
            self.GameEnd = True
            return 0
        return None
    
    def play_round(self, angle, speed):
        if self.GameEnd or self.shot is not None:
            return
        if self.currentPlayer == 0:
            current_tank = self.T0
        else:
            current_tank = self.T1

        if not current_tank.canShoot:
            self.switch_turn()
            return
        self.barrel_angles[self.currentPlayer] = (
            angle if self.currentPlayer == 0 else 180 - angle
        )
        x = current_tank.x
        slope = (ground_y(x + 1) - ground_y(x - 1)) / 2
        tilt = math.atan(slope)
        launch_angle = angle - math.degrees(tilt)

        direction = 1 if self.currentPlayer == 0 else -1
        pivot_dx = direction * 9 * 1.5
        pivot_dy = (-44 + 4) * 1.5

        pivot_x = x + pivot_dx * math.cos(tilt) - pivot_dy * math.sin(tilt)
        pivot_y = current_tank.y + pivot_dx * math.sin(tilt) + pivot_dy * math.cos(tilt)

        theta = math.radians(launch_angle)
        muzzle_distance = 41 * 1.5
        muzzle_x = pivot_x + muzzle_distance * math.cos(theta)
        muzzle_y = pivot_y - muzzle_distance * math.sin(theta)

        self.shot = projectile.Projectile(
            muzzle_x, muzzle_y, launch_angle, speed
        )
    def update(self, dt):
        if self.shot is None:
            return

        self.shot.update(dt)
        x, y = self.shot.x, self.shot.y

        if x < 0 or x > 1000 or y >= ground_y(x):
            self.shot = None
            self.switch_turn()
            return

        target = self.T1 if self.currentPlayer == 0 else self.T0


        slope = (ground_y(target.x + 1) - ground_y(target.x - 1)) / 2
        tilt = math.atan(slope)
        dx, dy = x - target.x, y - target.y
        local_x = dx * math.cos(tilt) + dy * math.sin(tilt)
        local_y = -dx * math.sin(tilt) + dy * math.cos(tilt)
        # Determine the component
        target_direction = -1 if self.currentPlayer == 0 else 1
        turret_center_x = -target_direction * 9

        elevation = math.radians(self.barrel_angles[1 - self.currentPlayer])
        forward = target_direction * (local_x - target_direction * 13.5)
        down = local_y + 60

        along = forward * math.cos(elevation) - down * math.sin(elevation)
        across = forward * math.sin(elevation) + down * math.cos(elevation)

        hit_barrel = 0 <= along <= 52.5 and abs(across) <= 4.5
        hit_brake = 46.5 <= along <= 61.5 and abs(across) <= 7.5

        if hit_barrel or hit_brake:
            component = "barrel"
        elif abs(local_x) <= 54 and -24 <= local_y <= 0:
            component = "Wheel"
        elif abs(local_x) <= 45 and -48 <= local_y < -24:
            component = "Body"
        elif abs(local_x - turret_center_x) <= 22.5 and -72 <= local_y < -48:
            component = "turret"
        else:
            return

        target.damage(component)
        self.shot = None
        self.winner = self.check_winner()
        if not self.GameEnd:
            self.switch_turn()
                
    def move_current_tank(self, dx):
        if self.GameEnd == True or self.shot != None:
            return
        if self.currentPlayer == 0:
            self.T0.move(dx)
            if self.T0.x < 60:
                self.T0.x = 60
            if self.T0.x > 940:
                self.T0.x = 940
            self.T0.y = ground_y(self.T0.x)
        if self.currentPlayer == 1:
            self.T1.move(dx)
            if self.T1.x < 60:
                self.T1.x = 60
            if self.T1.x > 940:
                self.T1.x = 940
            self.T1.y = ground_y(self.T1.x)

    def tank_state(self, vehicle):
            # Send the tank position, health, and repair status.
        return {
            "x": vehicle.x,
            "y": vehicle.y,
            "hp": vehicle.hp,
            "canShoot": vehicle.canShoot,
            "canMove": vehicle.canMove,
            "barrelTurns": vehicle.repair_barrel_turns,
            "wheelTurns": vehicle.repair_wheel_turns,
            }
    
    def get_state(self):
        shot_state = None
        if self.shot is not None:
            shot_state = {"x": self.shot.x, "y": self.shot.y}
        return {
            "T0": self.tank_state(self.T0),
            "T1": self.tank_state(self.T1),
            "currentPlayer": self.currentPlayer,
            "shot": shot_state,
            "winner": self.winner,
            "barrelAngles": self.barrel_angles,
        }
