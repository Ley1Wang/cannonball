import math
class Projectile:
    def __init__ (self, x, y, angle, speed):
        self.x = x
        self.y = y
        self.angle = angle
        self.speed = speed
        theta = math.radians(angle)
        self.vx = speed * math.cos(theta)
        self.vy = -speed * math.sin(theta)

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt + 4.9 * dt **2
        self.vy += 9.8 * dt