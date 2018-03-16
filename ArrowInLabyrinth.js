define('ArrowInLabyrinth', ['jQuery', 'jQueryUI', 'jQueryInherit', 'ExecutionUnitCommands', 'ShowMessages', 'Declaration', 'Exceptions'], function(){
	var ShowMessages = require('ShowMessages');
	var ExecutionUnitCommands = require('ExecutionUnitCommands');
	var Exceptions = require('Exceptions');
	var IncorrectInput = Exceptions.IncorrectInput;
	var InternalError = Exceptions.InternalError;

	var Message = ShowMessages.Message;

	var Coord = $.inherit({
		__constructor: function(x, y) {
			this.x = x;
			this.y = y;
		}
	});

	var FieldElem = $.inherit({
		__constructor: function(executionUnit, coord, isWall) {
			this.executionUnit = executionUnit;
			this.coord = coord;
			this.isWall = isWall;
			this.highlighted = false;
			this.cells = [];
		},
		highlightOn: function() {
			for (var i = 0; i < this.cells.length; ++i)
				this.cells[i].highlightOn();
			this.highlighted = true;
		},
		highlightOff: function() {
			for (var i = 0; i < this.cells.length; ++i)
				this.cells[i].highlightOff();
			this.highlighted = false;
		},
		draw: function() {
			var s = this.getElement();
			$(s).empty();
			$(s).removeClass('floor');
			$(s).removeClass('highlightFloor');
			$(s).removeClass('wall');
			$(s).removeClass('highlightWall');
			if (this.isWall)
				$(s).addClass(this.highlighted ? 'highlightWall' : 'wall');
			else
				$(s).addClass(this.highlighted ? 'highlightFloor' : 'floor');
			this.sortCells();
			var i = 0;
			while (i < this.cells.length && !this.cells[i++].draw());
		},
		setDefault: function() {
			this.highlighted = false;
			for (var i = 0; i < this.cells.length; ++i)
				this.cells[i].setDefault();
		},
		getCells: function() {
			this.sortCells();
			return this.cells;
		},
		sortCells: function() {
			this.cells.sort(function(a, b){
				return b.zIndex - a.zIndex;
			});
		},
		pushCell: function(cell) {
			this.cells.push(cell);
		},
		deleteElement: function(elem) {
			for (var i = 0; i < this.cells.length; ++i)
				if (this.cells[i].__self == elem.__self && this.cells[i].id == elem.id){
					this.cells.splice(i, 1);
					break;
				}
		},
		changedCells: function(){
			var arr = [];
			for (var i = 0; i < this.cells.length; ++i)
				if (this.cells[i].coord.x != this.coord.x || this.cells[i].coord.y != this.coord.y){
					arr.push(this.cells[i]);
					this.cells.splice(i--, 1);
			}
			return arr;
		},
		findCell: function(c, id){
			for (var i = 0; i < this.cells.length; ++i)
				if (this.cells[i].__self == c)
					return this.cells[i];
			return undefined;
		},
		mayPush: function(elem){
			for (var i = 0; i < this.cells.length; ++i)
				if (this.cells[i].zIndex >= elem.zIndex && this.cells[i].__self != Arrow)
					return false;
			return true;
		},
		getElement: function() {
			return $(this.executionUnit.table).children('tbody').children('tr:eq(' + this.coord.y + ')').children('td:eq(' + this.coord.x + ')');
		}
	});

	var Cell = $.inherit({
		__constructor: function(executionUnit, coord, obj) {
			this.executionUnit = executionUnit;
			this.coord = coord;
			$.extend(true, this, obj);
			this.zIndex = this.zIndex ? this.zIndex : 0;
			this.points = this.points ? this.points : 0;
			this.dLife = this.dLife ? this.dLife : 0;
		},
		draw: function() {
			var s = this.getElement();
			$(s).append('<div class = "' + this.style + '" + style = "z-index:' + this.zIndex + '"></div>');
			return true;
		},
		setDefault: function() {
			this.highlighted = false;
			this.highlightOff();
		},
		highlightOn: function(){},
		highlightOff: function(){},
		getElement: function() {
			return $(this.executionUnit.table).children('tbody').children('tr:eq(' + this.coord.y + ')').children('td:eq(' + this.coord.x + ')');
		}
	});

	var Lock = $.inherit(Cell, {
		__constructor: function(executionUnit, coord) {
			this.__base(executionUnit, coord, {style: 'lock', symbol: '#_', zIndex: 11});
			this.locked = true;
		},
		setDefault: function() {
			this.locked = true;
			this.isWall = true;
			this.style = 'lock';
			this.__base();
		},
		setUnlocked: function() {
			this.locked = false;
			this.isWall = false;
			this.style = 'floor';
		},
		draw: function() {
			if (!this.locked)
				return false;
			this.__base()
		},
		highlightOn: function(){
			if (this.locked)
				this.style = 'highlightedLock';
			this.__base();
		},
		highlightOff: function(){
			if (this.locked)
				this.style = 'lock';
			this.__base();
		}
	});

	var Key = $.inherit(Cell, {
		__constructor: function(executionUnit, coord, locks) {
			this.__base(executionUnit, coord, {style: 'key', symbol: '._', zIndex: 1});
			this.found = false;
			this.locks = locks;
		},
		setDefault: function() {
			this.found = false;
			this.__base();
		},
		draw: function() {
			if (this.found)
				return false;
			this.__base();
		}
	});

	var Arrow = $.inherit(Cell,{
		__constructor : function(executionUnit, coord,  dir) {
			this.__base(executionUnit, coord, {style: 'hero_' + dir, symbol: executionUnit.__self.dirs[dir], zIndex: 3});
			this.dir = dir;
			this.initCoord = coord;
			this.initDir = dir;
			this.dead = false;
		},
		setDefault: function(){
			this.dir = this.initDir;
			this.coord = this.initCoord;
			this.style = 'hero_' + this.initDir;
			this.dead = false;
			this.__base();
		},
		draw: function() {
			this.style = 'hero_' + this.dir;
			if (!this.dead)
				this.__base();
			else
				return false;
			return true;
		},
		move: function(d) {
			var dx = this.executionUnit.__self.changeDir[d][this.dir].dx;
			var dy = this.executionUnit.__self.changeDir[d][this.dir].dy;
			this.dir = this.executionUnit.__self.changeDir[d][this.dir].curDir;
			this.coord = new Coord(this.coord.x + dx, this.coord.y + dy);
		}
	});

	var Prize = $.inherit(Cell,{
		__constructor : function(executionUnit, coord, prize) {
			this.__base(executionUnit, coord, $.extend(prize,
				{id: executionUnit.maxPrizeId++, zIndex: prize.zIndex ? prize.zIndex : 1}));
			this.eaten = false;
		},
		setDefault: function(){
			this.eaten = false;
			this.__base();
		},
		draw: function() {
			if (!this.eaten)
				this.__base();
			else
				return false;
			return true;
		}
	});

	var Box = $.inherit(Cell,{
		__constructor : function(executionUnit, coord, box) {
			this.__base(executionUnit, coord, $.extend(box,
				{id: executionUnit.maxBoxId++, zIndex: box.zIndex ? box.zIndex : 2}));
			this.initCoord = coord;
		},
		move: function(dx, dy) {
			this.coord = new Coord(this.coord.x, this.coord.y);
		},
		setDefault: function() {
			this.coord = this.initCoord;
			this.__base();
		}
	});

	var Monster = $.inherit(Cell,{
		__constructor : function(executionUnit, coord, monster) {
			this.__base(executionUnit, coord, $.extend(true, monster,
				{id: executionUnit.maxMonsterId++, zIndex: monster.zIndex ? monster.zIndex : 3}));
			for (var i = 0; i < this.path.length; ++i)
				this.path[i] = $.extend(this.path[i], {startX: this.path[i].x, startY: this.path[i].y, cnt: 0});
			this.pathIndex = 0;
		},
		setDefault: function() {
			for (var i = 0; i < this.path.length; ++i){
				this.path[i].x = this.path[i].startX;
				this.path[i].y = this.path[i].startY;
				this.path[i].cnt = 0;
			}
			this.pathIndex = 0;
			this.coord = new Coord(this.path[0].x, this.path[0].y);
			this.__base();
		},
		tryNextStep: function() {
			var x = this.coord.x, y = this.coord.y, dir = this.path[this.pathIndex].dir;
			if (/*(this.pathIndex >= this.path.length || */this.pathIndex == this.path.length - 1 &&
					this.path[this.pathIndex].cnt == this.path[this.pathIndex].initCnt){
				if (!this.looped)
					return;
				x = this.path[0].startX;
				y = this.path[0].startY;
				dir = this.path[0].dir;
			}
			else
				if (this.path[this.pathIndex].cnt == this.path[this.pathIndex].initCnt)
					dir = this.path[this.pathIndex + 1].dir;

			if (dir && dir.length && !this.executionUnit.map[y + this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[dir]].dy][x + this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[dir]].dx].isWall){
				x = x + this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[dir]].dx;
				y = y + this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[dir]].dy;
			}
			return new Coord(x, y);
		},
		nextStep: function() {
			if /*(this.pathIndex >= this.path.length || */(this.pathIndex == this.path.length - 1 &&
					this.path[this.pathIndex].cnt == this.path[this.pathIndex].initCnt){
				if (!this.looped)
					return;
				this.setDefault();
			}
			else
				if (this.path[this.pathIndex].cnt == this.path[this.pathIndex].initCnt)
					++this.pathIndex;
			if (this.path[this.pathIndex].dir && this.path[this.pathIndex].dir.length &&
				!this.executionUnit.map[this.path[this.pathIndex].y +
				this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[this.path[this.pathIndex].dir]].dy][this.path[this.pathIndex].x +
				this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[this.path[this.pathIndex].dir]].dx].isWall){
				this.path[this.pathIndex].x += this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[this.path[this.pathIndex].dir]].dx;
				this.path[this.pathIndex].y += this.executionUnit.__self.changeDir.forward[this.executionUnit.__self.dirs[this.path[this.pathIndex].dir]].dy;
			}

			++this.path[this.pathIndex].cnt;
			this.coord.x = this.path[this.pathIndex].x;
			this.coord.y = this.path[this.pathIndex].y;
			//alert(this.coord.x + ' ' + this.coord.y);
		}
	});
	function forward(cnt) {
		curProblem.oneStep('forward', cnt != undefined ? cnt : 1, []);
	}

	function left(cnt) {
		curProblem.oneStep('left', cnt != undefined ? cnt : 1, []);
	}

	function right(cnt) {
		curProblem.oneStep('right', cnt != undefined ? cnt : 1, []);
	}

	function wait(cnt) {
		curProblem.oneStep('wait', cnt != undefined ? cnt : 1, []);
	}

	var MessageLabirinthOverrun = $.inherit(Message, {
		__constructor: function(step) {
			this.__base(['Шаг ', step + 1, ': Выход за границу лабиринта \n']);
		}
	});

	var MessageWall = $.inherit(Message, {
		__constructor: function(step) {
			this.__base(['Шаг ', step + 1, ': Уткнулись в стену \n']);
		}
	});

	var MessageCantMove = $.inherit(Message, {
		__constructor: function(step) {
			this.__base(['Шаг ', step + 1, ': Не можем пододвинуть \n']);
		}
	});

	var MessagePrizeFound = $.inherit(Message, {
		__constructor: function(step, name, pnts, all) {
			this.__base(['Шаг ', step + 1, ': Нашли бонус ', name, ' \n', 'Текущее количество очков: ',
						pnts, '\n', all? 'Вы собрали все бонусы! \n' : '']);
		}
	});

	var MessageInvalidDirectionFine = $.inherit(Message, {
		__constructor: function(step, pnts) {
			this.__base(['Шаг ', step + 1, ': Штраф за неправильное направление \n', 'Текущее количество очков: ',
						pnts, '\n']);
		}
	});

	var MessageCellOpened = $.inherit(Message, {
		__constructor: function(step, x, y) {
			this.__base(['Шаг ', step + 1, ': Открыли ячейку с координатами ', x, ', ', y, '\n']);
		}
	});

	function objectPosition(args){
		if (args.length != 3) {
			throw new IncorrectInput('objectPosition: Некорректное число аргументов: ' + args.length + ' вместо 3');
		}
		var condition = args[0];
		var object = args[1];
		var direction = args[2];
		var result = true;
		var dir = '';
		switch(direction){
			case 'atTheLeft':
			case 'слева':
				dir = 'left';
				break;
			case 'atTheRight':
			case 'справа':
				dir = 'right';
				break;
			case 'inFrontOf':
			case 'спереди':
				dir = 'forward';
				break;
			case 'behind':
			case 'сзади':
				dir = 'behind';
				break;
			default:
				return false; //should we throw exception?
		}
		var cell = curProblem.executionUnit.getExecutionUnit().getFieldElem(dir);
		switch(object){
			case 'wall':
			case 'Стена':
				result = cell.isWall;
				break;
			case 'prize':
			case 'Приз':
				result = cell.findCell(Prize) != undefined;
				break;
			case 'box':
			case 'Ящик':
				result = cell.findCell(Box) != undefined;
				break;
			case 'monster':
			case 'Монстр':
				result = cell.findCell(Monster) != undefined;
				break;
			case 'lock':
			case 'Замок':
				result = cell.findCell(Lock) != undefined;
				break;
			case 'key':
			case 'Ключ':
				result = cell.findCell(Key) != undefined;
				break;
			case 'border':
			case 'Граница':
				result = curProblem.executionUnit.getExecutionUnit().labirintOverrun(cell.coord.x, cell.coord.y);
				break;
			case 'cell':
			case 'Пустое место':
				result = !(cell.isWall ||
					cell.findCell(Prize) != undefined ||
					cell.findCell(Box) != undefined ||
					cell.findCell(Monster) != undefined ||
					cell.findCell(Lock) != undefined ||
					cell.findCell(Key) != undefined ||
					curProblem.executionUnit.getExecutionUnit().labirintOverrun(cell.coord.x, cell.coord.y));
				break;
			default:
				return false;
		}
		if (condition == 'not')
			result = !result;
		return result;
	}

	function objectPosition_handler(object, direction){
		var result = true;
		var dir = '';
		switch(direction.v){
			case 'atTheLeft':
			case 'слева':
				dir = 'left';
				break;
			case 'atTheRight':
			case 'справа':
				dir = 'right';
				break;
			case 'inFrontOf':
			case 'спереди':
				dir = 'forward';
				break;
			case 'behind':
			case 'сзади':
				dir = 'behind';
				break;
			default:
				return false; //should we throw exception?
		}
		var cell = curProblem.executionUnit.getExecutionUnit().getFieldElem(dir);
		switch(object.v){
			case 'wall':
			case 'Стена':
				result = cell.isWall;
				break;
			case 'prize':
			case 'Приз':
				result = cell.findCell(Prize) != undefined;
				break;
			case 'box':
			case 'Ящик':
				result = cell.findCell(Box) != undefined;
				break;
			case 'monster':
			case 'Монстр':
				result = cell.findCell(Monster) != undefined;
				break;
			case 'lock':
			case 'Замок':
				result = cell.findCell(Lock) != undefined;
				break;
			case 'key':
			case 'Ключ':
				result = cell.findCell(Key) != undefined;
				break;
			case 'border':
			case 'Граница':
				result = curProblem.executionUnit.getExecutionUnit().labirintOverrun(cell.coord.x, cell.coord.y);
				break;
			case 'cell':
			case 'Пустое место':
				result = !(cell.isWall ||
					cell.findCell(Prize) != undefined ||
					cell.findCell(Box) != undefined ||
					cell.findCell(Monster) != undefined ||
					cell.findCell(Lock) != undefined ||
					cell.findCell(Key) != undefined ||
					curProblem.executionUnit.getExecutionUnit().labirintOverrun(cell.coord.x, cell.coord.y));
				break;
			default:
				return false;
		}
		return result;
	}

	function isCompleted_handler() {
		return curProblem.executionUnit.getExecutionUnit().isCompleted();
	}

	function isCompleted(args) {
		var condition = args[0];
		var result = curProblem.executionUnit.getExecutionUnit().isCompleted();

		if (condition == 'not') {
			result = !result;
		}

		return result;
	}

	return {
		ArrowInLabyrinth: $.inherit({
			__constructor: function(problem, problemData, div) {
				this.data = {};
				$.extend(true, this.data, problemData.data);
				this.div = div;
				$(this.div).empty();
				this.problem = problem;
				this.table = $('<table style="border-spacing: 0px"></table>')
					.appendTo(this.div);
				this.initLabyrinth();
				this.constructCommands();
			},

			constructCommands: function() {
				this.commands = {};
				var args = [
					new ExecutionUnitCommands.CommandArgumentSpinCounter(1, undefined)];
				this.commands['forward'] = new ExecutionUnitCommands.ExecutionUnitCommand('forward', forward, args);
				this.commands['left'] = new ExecutionUnitCommands.ExecutionUnitCommand('left', left, args);
				this.commands['right'] = new ExecutionUnitCommands.ExecutionUnitCommand('right', right, args);
				this.commands['wait'] = new ExecutionUnitCommands.ExecutionUnitCommand('wait', wait, args);
			},

			getCommandName: function(command) {
				return this.__self.cmdClassToName[command];
			},

			getAllowedCommands: function() {
				return this.data.commands;
			},

			getCommandNames: function() {
				return this.__self.cmdClassToName;
			},

			initLabyrinth: function() {
				this.life = this.data.startLife;
				this.points = this.data.startPoints;
				this.stepsFine = this.data.stepsFine;
				this.mapFromTest = this.data.map.slice();
				this.map = [];
				this.maxBoxId = 0;
				this.maxMonsterId = 0;
				this.maxPrizeId = 0;
				this.maxCellId = 0;
				this.monsters = [];
				this.numOfPrizes = 0;
				this.curNumOfPrizes = 0;
				this.visited = false;
				this.dx = 0;
				this.dy = 0;
				this.specSymbols = this.data.specSymbols;
				this.movingElements = this.data.movingElements;
				this.keys = this.data.keys;
				this.locks = this.data.locks
				this.setLabyrinth(this.specSymbols);
				this.setMonsters(this.movingElements);
				this.setKeysAndLocks(this.keys, this.locks);
				//this.map = jQuery.extend(true, [], this.defaultLabirint);
				this.invalidDirectionFine = this.invalidDirectionFine ? this.invalidDirectionFine : 0;
				this.fillLabyrinth();
			},

			setDefault: function(dontDraw) {
				this.setLabyrinth(this.specSymbols);
				this.setMonsters(this.movingElements);
				this.setKeysAndLocks(this.keys, this.locks);
				for (var i = 0; i < this.map.length; ++i){
					for (var j = 0; j < this.map[i].length; ++j){
						var arr = this.map[i][j].changedCells();
						for (var k = 0; k < arr.length; ++k){
							this.map[arr[k].coord.y][arr[k].coord.x].pushCell(arr[k]);
							switch(arr[k].__self){
								case Arrow:
									this.arrow = arr[k];
									break;
								case Monster:
									this.monsters[arr[k].id] = arr[k];
									this.monsters[arr[k].id].x = arr[k].coord.x;
									this.monsters[arr[k].id].y = arr[k].coord.y;
									break;
							}
						}
					}

				}
				this.highlightOn();
				this.arrow.setDefault();
				this.points = this.data.startPoints;
				this.curNumOfPrizes = 0;
				if (!dontDraw){
					this.drawLabyrint();
				}
			},

			setLabyrinth: function(specSymbols) {
				var obj = undefined;
				this.numOfPrizes = 0;
				for (var i = 0; i < this.mapFromTest.length; ++i){
					this.map[i] = [];
					for (var j = 0; j < this.mapFromTest[i].length; ++j){
						this.map[i][j] = [];
						var c = new Coord(j, i);
						this.map[i][j] = new FieldElem(this, c,this.mapFromTest[i][j] == "#")
						if (this.mapFromTest[i][j] == "R" || this.mapFromTest[i][j] == "U" ||
							this.mapFromTest[i][j] == "D" ||this.mapFromTest[i][j] == "L" ){
							obj = this.arrow = new Arrow(this, c, this.__self.dirs[this.mapFromTest[i][j]]);
						}
						for (var k = 0; k < specSymbols.length; ++k)
							if (specSymbols[k].symbol == this.mapFromTest[i][j]){
								obj = specSymbols[k].action == "eat" ?
									new Prize(this, c, specSymbols[k]) :
									new Box(this, c,specSymbols[k]) ;
								if (obj.__self == Prize)
									++this.numOfPrizes;
								break;
							}
						if (obj)
							this.map[i][j].pushCell(obj);
						obj = undefined;
					}
				}
			},

			setMonsters: function(monsters) {
				this.monsters = [];
				var obj = undefined;
				for (var k = 0; k < monsters.length; ++k){
					var c = new Coord(monsters[k].path[0].x, monsters[k].path[0].y);
					obj = new Monster(this, c, monsters[k]);
					this.map[c.y][c.x].pushCell(obj);
					this.monsters.push({'x': c.x, 'y': c.y});
				}
			},

			setKeysAndLocks: function(keys, locks) {
				var obj = undefined;
				for (var k = 0; k < keys.length; ++k){
					var c = new Coord(keys[k].x, keys[k].y);
					obj = new Key(this, c, locks[k]);
					this.map[c.y][c.x].pushCell(obj);
					for (var j = 0; j < locks[k].length; ++j){
						var c1 = new Coord(locks[k][j].x, locks[k][j].y);
						obj = new Lock(this, c1);
						this.map[c1.y][c1.x].pushCell(obj);
					}
				}
			},

			fillLabyrinth: function() {
				this.highlightOn();
				$(this.table).empty();
				for (var i = 0; i < this.map.length; ++i){
					var tr = $('<tr></tr>')
						.appendTo(this.table);
					for (var j = 0; j < this.map[i].length; ++j){
						tr.append('<td></td>');
						this.map[i][j].draw();
					}
				}

				this.updateSizes();

				$(window).resize(function(self){
					return function(){
						self.updateSizes();
					}
				}(this));
			},

			highlightOn: function() {
				for (var i = 0; i < this.map.length; ++i)
					this.map[i][this.arrow.coord.x].highlightOn();
				for (var i = 0; i < this.map[0].length; ++i)
					this.map[this.arrow.coord.y][i].highlightOn();
			},

			highlightOff: function() {
				for (var i = 0; i < this.map.length; ++i)
					this.map[i][this.arrow.coord.x].highlightOff();
				for (var i = 0; i < this.map[0].length; ++i)
					this.map[this.arrow.coord.y][i].highlightOff();
			},

			updateSizes: function() {
				var width = $(this.table).children('tbody').children('tr').children('td').css('width');
				if (width == '0px') {
					width = 32;
				}
				$(this.table).children('tbody').children('tr').children('td').css('height', width);
			},

			drawLabyrint: function() {
				for (var i = 0; i < this.map.length; ++i)
					for (var j = 0; j < this.map[i].length; ++j) {
						this.map[i][j].draw();
					}
				this.updateSizes();
			},

			executeCommand: function(command, args) {
				if (this.data.commands.indexOf(command) === -1) {
					throw new IncorrectInput('Команда ' + command + ' не поддерживается');
				}
				this.oneStep(command, 1);
			},

			oneStep: function(dir) {
				var x = this.arrow.coord.x;
				var y = this.arrow.coord.y;
				this.dx = this.__self.changeDir[dir][this.arrow.dir].dx;
				this.dy = this.__self.changeDir[dir][this.arrow.dir].dy;
				this.changeLabyrinth(this.problem.step, undefined, this.__self.changeDir[dir][this.arrow.dir].curDir, !this.problem.speed);
				if (this.stepsFine){
					this.points -= this.stepsFine;
					var mes = new ShowMessages.MessageStepFine(this.problem.step, this.points);
				}
			},

			labirintOverrun: function(x, y){
				return (x >= this.map[0].length || x < 0 || y >= this.map.length || y < 0);
			},

			tryNextCoord: function(i, changedElems){
				var result = true;
				var cX = this.arrow.coord.x + this.dx;
				var cY = this.arrow.coord.y + this.dy;
				if (this.labirintOverrun(cX, cY)){
					var mes = new MessageLabirinthOverrun(i);
					result = false;
				}
				else {
					var elem = this.map[cY][cX];
					if (elem.isWall){
						var mes = new MessageWall(i);
						result = false;
					}
					var cells = elem.getCells();
					for (var j = 0; !elem.isWall && j < cells.length; ++j){
						if (cells[j].__self == Lock && cells[j].locked){
							var mes = new MessageWall(i);
							result = false;
							break;
						}
						if (cells[j].__self == Monster){
							this.die();
							break;
						}
						if (cells[j].__self == Box){
							var tX = cX + this.dx;
							var tY = cY + this.dy;
							var f = this.labirintOverrun(tX, tY);
							if (!f){
								var el1 = this.map[tY][tX];
								f = el1.isWall;
								var cells1 = el1.getCells();
								for (var k = 0; k < cells1.length; ++k)
									f = f || (cells1[k].zIndex >= cells[j].zIndex);
							}
							if (f){
								var mes = new MessageCantMove(i);
								result = false;
							}
							else{
								var box = cells[j];
								this.map[cY][cX].deleteElement(cells[j]);
								box.coord = new Coord(tX, tY);
								this.map[tY][tX].pushCell(box);
								changedElems.push(new Coord(tX, tY));
								--j;
								continue;
							}
						}
						if (cells[j].__self == Prize && !cells[j].eaten){
							cells[j].eaten = true;
							var mes = new MessagePrizeFound(i, cells[j].name, (this.points + cells[j].points),
								++this.curNumOfPrizes == this.numOfPrizes);
							this.life += cells[j].dLife;
							this.points += cells[j].points;
							this.map[cY][cX].deleteElement(cells[j]);
							--j;
							continue;
						}
						if (cells[j].__self == Key && !cells[j].found){
							for (var k = 0; k < cells[j].locks.length; ++k){
								var x = cells[j].locks[k].x;
								var y = cells[j].locks[k].y;
								var mes = new MessageCellOpened(i, x, y);
								var cells1 = this.map[y][x].getCells();
								for(var l = 0; l < cells1.length; ++l)
									if(cells1[l].__self == Lock)
										cells1[l].setUnlocked();
								changedElems.push(new Coord(x, y));
							}
							cells[j].found = true;
							this.map[cY][cX].deleteElement(cells[j]);
							--j;
							continue;
						}
					}
				}
				return result;
			},

			changeLabyrinth: function(i, cnt, newDir, dontNeedToDraw){
				this.life += this.dLife;
				var changedElems = [];
				var cX = this.arrow.coord.x + this.dx;
				var cY = this.arrow.coord.y + this.dy;
				changedElems.push(new Coord(this.arrow.coord.x, this.arrow.coord.y));
				var changeCoord = this.tryNextCoord(i, changedElems);
				if (changeCoord){
					for (var j = 0; j < this.map.length; ++j){
						this.map[j][this.arrow.coord.x].highlightOff();
						if (j != this.arrow.coord.y)
							changedElems.push(new Coord(this.arrow.coord.x, j));
					}
					for (var j = 0; j < this.map[0].length; ++j){
						this.map[this.arrow.coord.y][j].highlightOff();
						if (j != this.arrow.coord.x)
							changedElems.push(new Coord(j, this.arrow.coord.y));
					}
					this.map[this.arrow.coord.y][this.arrow.coord.x].deleteElement(this.arrow);
					this.arrow.coord = new Coord(cX, cY);
					this.arrow.dir = newDir;
					this.map[cY][cX].pushCell(this.arrow);
				}
				else if(this.invalidDirectionFine){
					this.points -= this.invalidDirectionFine;
					var mes = new MessageInvalidDirectionFine(this.problem.step, this.points);
				}
				if (!this.arrow.dead){
					for (var k = 0; k < this.monsters.length; ++k){
						var elem = this.map[this.monsters[k].y][this.monsters[k].x];
						var m = elem.findCell(Monster, k);
						var c = m.tryNextStep();
						var elem1 = this.map[c.y][c.x];
						if (elem1.mayPush(m)){
							elem.deleteElement(m);
							m.nextStep();
							m.coord = c;
							changedElems.push(c);
							changedElems.push(new Coord(this.monsters[k].x, this.monsters[k].y));
							elem1.pushCell(m);
							if (c.x == this.arrow.coord.x && c.y == this.arrow.coord.y)
								this.die();
							this.monsters[k].x = c.x;
							this.monsters[k].y = c.y;
						}
						else{
							++m.path[m.pathIndex].cnt;
						}
					}
				}
				if (changeCoord && 	!this.arrow.dead){
					changedElems.push(new Coord(cX, cY));
					for (var j = 0; j < this.map.length; ++j){
						this.map[j][this.arrow.coord.x].highlightOn();
						if (j != this.arrow.coord.y)
							changedElems.push(new Coord(this.arrow.coord.x, j));
					}
					for (var j = 0; j < this.map[0].length; ++j){
						this.map[this.arrow.coord.y][j].highlightOn();
						if (j != this.arrow.coord.x)
							changedElems.push(new Coord(j, this.arrow.coord.y));
					}
				}
				if (!dontNeedToDraw){
					for (var j = 0; j < changedElems.length; ++j)
						this.map[changedElems[j].y][changedElems[j].x].draw();
				}
			},

			getFieldElem: function(dir) {
				var newDir = this.__self.changeDir[dir][this.arrow.dir];
				var cX = this.arrow.coord.x + newDir.dx;
				var cY = this.arrow.coord.y + newDir.dy;
				if (dir != 'forward' && dir != 'behind')
				{
					cX += this.__self.changeDir['forward'][newDir.curDir].dx;
					cY += this.__self.changeDir['forward'][newDir.curDir].dy;
				}
				return this.labirintOverrun(cX, cY) ? new FieldElem(this, new Coord(cX, cY), false) : this.map[cY][cX];
			},

			isGameOver: function() {
				return this.arrow.dead;
			},

			die: function() {
				this.arrow.dead = true;
				this.problem.die();
			},

			gameOver: function() {
				this.arrow.dead = true;
			},

			draw: function() {
				this.drawLabyrint();
			},

			getPoints: function() {
				return this.points;
			},

			isCommandSupported: function(command) {
				return this.data.commands.indexOf(command) !== -1
			},

			getConditionProperties: function(name) {
				return this.__self.testFunction;
			},

			getCommands: function() {
				return this.commands;
			},

			getCssFileName: function() {
				return this.__self.cssFileName;
			},

			isCompleted: function() {
				return this.curNumOfPrizes == this.numOfPrizes;
			},

			getState: function() {
				return {
					'arrow': {
						'dir': this.arrow.dir,
						'coord': this.arrow.coord,
						'dead': this.arrow.dead
					},
					'points': this.points,
					'curNumOfPrizes': this.curNumOfPrizes,
					'completed': this.isCompleted()
				}
			},

			executionFinished: function() {
				return;
			},

			onTabSelect: function() {
				this.updateSizes();
			}
		},
		{ //static methods and properties
			cmdClassToName: {
				'forward': 'Прямо',
				'left': 'Налево',
				'right': 'Направо',
				'wait': 'Ждать',
			},

			changeDir: {
				'forward':{
					'up': {dx: 0, dy: -1, curDir: 'up'},
					'down': {dx: 0, dy: 1, curDir: 'down'},
					'left':{dx: -1, dy: 0, curDir: 'left'},
					'right': {dx: 1, dy: 0, curDir: 'right'}
				},
				'left':{
					'up': {dx: 0, dy: 0, curDir: 'left'},
					'down': {dx: 0, dy: 0, curDir: 'right'},
					'left':{dx: 0, dy: 0, curDir: 'down'},
					'right': {dx: 0, dy: 0, curDir: 'up'}
				},
				'right':{
					'up': {dx: 0, dy: 0, curDir: 'right'},
					'down': {dx: 0, dy: 0, curDir: 'left'},
					'left':{dx: 0, dy: 0, curDir: 'up'},
					'right': {dx: 0, dy: 0, curDir: 'down'}
				},
				'wait':{
					'up': {dx: 0, dy: 0, curDir: 'up'},
					'down': {dx: 0, dy: 0, curDir: 'down'},
					'left':{dx: 0, dy: 0, curDir: 'left'},
					'right': {dx: 0, dy: 0, curDir: 'right'}
				},
				'behind':{
					'up': {dx: 0, dy: 1, curDir: 'up'},
					'down': {dx: 0, dy: -1, curDir: 'down'},
					'left':{dx: 1, dy: 0, curDir: 'left'},
					'right': {dx: -1, dy: 0, curDir: 'right'}
				}
			},

			dirs: {
				'R': 'right',
				'L': 'left',
				'U': 'up',
				'D': 'down'
			},

			testFunction : [{
				'name': 'objectPosition',
				'title': 'Позиция:',
				'args': [
				new ExecutionUnitCommands.CommandArgumentSelect([
						['wall', 'Стена'],
						['prize', 'Приз'],
						['monster', 'Монстр'],
						['box', 'Ящик'],
						['lock', 'Замок'],
						['key', 'Ключ'],
						['border', 'Граница'],
						['cell', 'Пустое место']

					]),
				new ExecutionUnitCommands.CommandArgumentSelect([
					['atTheLeft', 'слева'],
					['atTheRight', 'справа'],
					['inFrontOf', 'спереди'],
					['behind', 'сзади']
				])],
				'jsFunc': objectPosition,
				'handlerFunc': objectPosition_handler,
			},
			{
				'name': 'isCompleted',
				'title': 'Задание выполнено',
				'args':[],
				'jsFunc': isCompleted,
				'handlerFunc': isCompleted_handler
			}],

			cssFileName: "styles/arrowInLabyrinth.css",

			jsTreeTypes: [
				['left', 'images/left_small.png'],
				['right', 'images/right_small.png'],
				['forward', 'images/forward_small.png'],
				['wait', 'images/wait_small.png']
			]
		})
	}
});
