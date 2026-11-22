class Tank:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.hp = 100
        self.canMove = True
        self.canShoot = True
        self.repair_wheel_turns = 0
        self.repair_barrel_turns = 0

    def start_turn(self):
        self.canMove = self.repair_wheel_turns == 0
        self.canShoot = self.repair_barrel_turns == 0

    def damage(self, component):
        if component == "Body":
            self.hp -= 40
        if component == "turret":
            self.hp -= 20
        elif component == "barrel":
            if self.canShoot:
                self.hp -= 10
                self.repair_barrel_turns = 2
                self.canShoot = False
            else:
                self.hp -= 5

        if component == "Wheel":
            if self.canMove:
                self.hp -= 10
                self.repair_wheel_turns = 2
                self.canMove = False
            else:
                self.hp -= 5
        if self.hp <= 0:
            self.hp = 0 

    def repair(self):
        self.hp += 5
        if self.repair_wheel_turns != 0:
            self.repair_wheel_turns -= 1
        if self.repair_barrel_turns != 0:
            self.repair_barrel_turns -= 1


    def move(self, dx):
        if not self.canMove:
            return
        self.x += dx
        
        
    