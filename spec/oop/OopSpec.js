describe("Oop", function () {
	var ZZT = require("../../tsout/index_debug.js");
	var board;

	var DefaultParser = new ZZT.Parser();
	DefaultParser.registerModule(ZZT.Default.DefaultCommandSet);

	beforeAll(function () {
		(function () {
		    var oldLog = console.log;
		    console.history = [];
		    console.log = function (message) {
		        console.history.push(message);
		        oldLog.apply(console, arguments);
		    };
		})();
	});

	beforeEach(function () {
		console.history = [];
		board = new ZZT.Board();
		board.configure({
			executor: {
				autoStep: true
			},
			parser: DefaultParser
		});
	});

	describe("Initialization and execution", function () {
		it("should spawn an object and terminate", function (done) {
			board.setup(function () {
				object('Player', function () {
					print('Hello world')
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['Hello world'].toString())
				done();
			});
			board.start();
		});

		it("should ignore trying to spawn a non-existent object", function (done) {
			board.setup(function () {
				object('Player', function () {
					print('Hello world')
					terminate()
				});
			});
			board.run(function () {
				spawn('Dummy1')
				spawn('Player')
				spawn('Dummy2')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['Hello world'].toString())
				done();
			});
			board.start();
		});

		it("should fail if there are object definitions with identical names", function (done) {
			try {
				board.setup(function () {
					object('Player', function () {
						print('fail')
						terminate()
					});
					object('Player', function () {
						print('fail')
						terminate()
					});
				});
				board.run(function () {
					spawn('Player')
				});
				board.finish(function () {
					done.fail();
				});
				board.start();
			}
			catch (e) {
				expect(e).toEqual("Duplicate object definition");
				done();
			}
		});
	});

	describe("Variables and expressions", function () {
		it("should set variables and evaluate expressions", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 'a')
					print($('var'))
					set('var', 1)
					print($('var'))
					set('var', expr('$var + 1'))
					print($('var'))
					set('var', expr('1 === 1'))
					print($('var'))
					set('var', expr('(Math.cos(0) + 1) * parseFloat("0.75")'))
					print($('var'))
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['a', 1, 2, true, 1.5].toString())
				done();
			});
			board.start();
		});

		it("should execute a label with block-scope arguments, as passed from the caller", function (done) {
			board.setup(function () {
				object('Player', function () {
					jump('do', [1, 2])
					end()
					label('do', ['param1', 'param2'])
						set('param1', expr('$_param1 + 1'))
						print(expr('$_param1 + $_param2'))
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([4].toString())
				done();
			});
			board.start();
		});

		it("should spawn objects with initialization variables", function (done) {
			board.setup(function () {
				object('Player', ['param'], function () {
					_if('$_param === 1')
						_if('$_param === 1')
							print($('param'))
						_endif()
					_endif()
					spawn('Child', [2, 3])
					end()
				});

				object('Child', ['param1', 'param2'], function () {
					print(expr('$_param1'))
					print(expr('$_param2'))
					terminate()
				});
			});
			board.run(function () {
				spawn('Player', [1])
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3].toString())
				done();
			});
			board.start();
		});
	});

	describe("Control flow", function () {
		it("should select the correct block in an if-else statement", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 1)
					_if('$var === 1')
						print(1)
					_endif()

					_if('0 === 1')
						print(-1)
					_elif('$var === 1')
						print(2)
					_else()
						print(-1)
					_endif()

					_if('0 === 1')
						print(-1)
					_elif('$var === 2')
						print(-1)
					_else()
						print(3)
					_endif()

					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3].toString())
				done();
			});
			board.start();
		});

		it("should loop a block a fixed number of times", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 3)
					loop('$var')
						print($('var'))
						set('var', expr('$var - 1'))
					endloop()
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([3, 2, 1].toString())
				done();
			});
			board.start();
		});

		it("should not run a loop if the count expression is non-numeric", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 'a')
					loop('$var')
						print(expr('fail'))
					endloop()
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).not.toEqual(['fail'].toString())
				done();
			});
			board.start();
		});

		it("should allow nested blocks", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 0)
					loop(2)
						loop(2)
							_if('$var % 2 === 0')
								_if('true')
									print('a')
								_endif()
							_else()
								print('b')
							_endif()
							set('var', expr('$var + 1'))
						endloop()
					endloop()
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['a', 'b', 'a', 'b'].toString())
				done();
			});
			board.start();
		});
	});

	describe("Labels", function () {
		it("should jump between labels", function (done) {
			board.setup(function () {
				object('Player', function () {
					jump('one')
					end()
					label('one')
						print(1)
						jump('two')
					end()
					label('two')
						print(2)
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2].toString())
				done();
			});
			board.start();
		});

		it("should allow jumping to the current label", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('count', 1)
					jump('do')
					end()
					label('do')
						print(expr('$count'))
						_if('$count === 3')
							terminate()
						_endif()
						set('count', expr('$count + 1'))
						jump('do')
					end()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3].toString())
				done();
			});
			board.start();
		});

		it("should handle chained labels", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 1)
					jump('one')
					end()
					label('one')
						print('a')
					label('two')
						_if('$var === 1')
							print(1)
							set('var', 2)
							jump('two')
						_elif('$var === 2')
							print(2)
							terminate()
						_endif()
					label('three')
					end()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['a', 1, 2].toString())
				done();
			});
			board.start();
		});

		it("should handle chained labels with zapping", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('var', 1)
					jump('label')
					end()
					label('label')
					label('label')
					label('label')
						print($('var'))
						set('var', expr('$var + 1'))
						zap('label')
						jump('label')
					end()
					label('label')
						print('done')
					terminate()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3, 'done'].toString())
				done();
			});
			board.start();
		});

		it("should enable/disable labels with 'zap' and 'restore'", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('stop', false)
					jump('do')
					end()
					label('do')
						_if('$stop === true')
							print(3)
							terminate()
						_endif()
						print(1)
						zap('do')
						jump('do')
					end()
					label('do')
						print(2)
						set('stop', true)
						restore('do')
						jump('do')
					end()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3].toString())
				done();
			});
			board.start();
		});

		it("should ignore non-existent labels", function (done) {
			board.setup(function () {
				object('Player', function () {
					set('stop', false)
					jump('none')
					print(1)
					jump('zap')
					end()
					label('zap')
						zap('zap')
						jump('zap')
						print(2)
						jump('restore')
					end()
					label('restore')
						_if('$stop === true')
							print(3)
							terminate()
						_endif()
						restore('restore')
						set('stop', true)
						jump('restore')
					end()
				});
			});
			board.run(function () {
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2, 3].toString())
				done();
			});
			board.start();
		});
	});

	describe("Object-object messaging", function () {
		it("should begin executing a label when sent from another object", function (done) {
			board.setup(function () {
				object('ObjectA', function () {
					end()
					label('do')
						print('A')
					end()
				});
				object('ObjectB', function () {
					end()
					label('do')
						print('B')
					end()
				});
				object('ObjectC', function () {
					send('ObjectA', 'do')
					wait(1)
					terminate()
				})
			});
			board.run(function () {
				spawn('ObjectA')
				spawn('ObjectA')
				spawn('ObjectB')
				spawn('ObjectC')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['A', 'A'].toString())
				done();
			});
			board.start();
		});

		it("should allow objects to send messages to itself", function (done) {
			board.setup(function () {
				object('Player', function () {
					send('self', 'do')
					end()
					label('do')
						print(1)
					end()
				});
			});
			board.run(function () {
				spawn('Player')
				wait(1)
				send('board', 'do')
				end()
				label('do')
					print(2)
					terminate()
				end()
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2].toString())
				done();
			});
			board.start();
		});

		it("should ignore messages if an object is locked", function (done) {
			board.setup(function () {
				object('ObjectA', function () {
					end()
					label('do')
						print('A')
						lock()
						send('ObjectB', 'do2')
					end()
				});
				object('ObjectB', function () {
					print('B')
					send('ObjectA', 'do')
					end()
					label('do2')
						print('B2')
						send('ObjectA', 'do')
					terminate()
				});
			});
			board.run(function () {
				spawn('ObjectA')
				spawn('ObjectB')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['B', 'A', 'B2'].toString())
				done();
			});
			board.start();
		});

		it("should pass block-scope variables with a message", function (done) {
			board.setup(function () {
				object('Player', function () {
					jump('do', ['a'])
					end()
					label('do', ['param'])
						print($('param'))
						send('Other', 'otherdo', [expr('1 + 1')])
					end()
				});

				object('Other', function () {
					end()
					label('otherdo', ['param'])
						print($('param'))
					terminate()
				});
			});
			board.run(function () {
				spawn('Other')
				spawn('Player')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['a', 2].toString())
				done();
			});
			board.start();
		});
	});

	describe("Entity tree", function () {
		it("should spawn nested (child) entities", function (done) {
			board.setup(function () {
				object('Parent', function () {
					spawn('Child')
					send('children[name=Child]', 'do')
					end()
					label('done')
						print('B')
					terminate()
				});
				object('Child', function () {
					end()
					label('do')
						spawn('Zygote')
						send('children[name=Zygote]', 'do2')
					end()
				});
				object('Zygote', function () {
					end()
					label('do2')
						spawn('Zygote')
						send('children[name=Zygote]', 'do3')
					end()
					label('do3')
						print('A')
						send('parent/parent/parent', 'done')
					end()
				});
			});
			board.run(function () {
				spawn('Parent')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['A', 'B'].toString())
				done();
			});
			board.start();
		});

		it("should spawn nested (child) entities using tree builder command", function (done) {
			board.setup(function () {
				object('Parent', function () {
					send('children[name=Child]', 'do')
					end()
					label('done')
						print('B')
					terminate()
				});
				object('Child', function () {
					end()
					label('do')
						send('children[name=Zygote]', 'do2')
					end()
				});
				object('Zygote', function () {
					end()
					label('do2')
						send('children[name=Zygote]', 'do3')
					end()
					label('do3')
						print('A')
						send('parent/parent/parent', 'done')
					end()
				});
			});
			board.run(function () {
				spawn_tree(
					['Parent', [], [
						['Child', [], [
							['Zygote', [], [
								['Zygote', [], []]
							]]
						]]
					]]
				);
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['A', 'B'].toString())
				done();
			});
			board.start();
		});

		it("should delete child objects recursively when parent is deleted", function (done) {
			board.setup(function () {
				object('Parent', function () {
					spawn('Child')
					end()
					label('delete')
						die()
					end()
				});
				object('Child', function () {
					spawn('Zygote')
					end()
					label('respond')
						print('A')
						send('children[name=Zygote]', 'respond')
					end()
				});
				object('Zygote', function () {
					end()
					label('respond')
						print('B')
					end()
				});
			});
			board.run(function () {
				spawn('Parent')
				wait(1)
				send([['children',{'name':'Parent'}]], 'delete')
				wait(1)
				send([['children',{'name':'Parent'}],['children',{'name':'Child'}]], 'respond')
				wait(3)
				terminate()
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([].toString())
				done();
			});
			board.start();
		});

		it("should morph an entity into a new instance of another", function (done) {
			board.setup(function () {
				object('Human', function () {
					spawn('Child')
					end()
					label('morph')
						print(1)
						become('Warewolf')
					end()
				});
				object('Warewolf', function () {
					end()
					label('howl')
						print(2)
					terminate()
				});
				object('Child', function () {
					send('parent', 'morph')
					wait(2)
					send('parent', 'howl')
				});
			});
			board.run(function () {
				spawn('Human')
				spawn('Bystander')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual([1, 2].toString())
				done();
			});
			board.start();
		});

		it("should resolve complex scopes to 0..N entities", function (done) {
			board.setup(function () {
				//A
				//  AA
				//  AA
				//  AB
				//    ABB
				//B
				//  BA
				object('A', function () {
					spawn('AA')
					spawn('AA')
					spawn('AB')
					end()
					label('A_do')
						print('A')
					end()
				});
				object('AA', function () {
					end()
					label('AA_do')
						print('AA')
					end()
				});
				object('AB', function () {
					spawn('ABA')
					end()
					label('AB_do')
						print('AB')
					end()
				});
				object('ABA', function () {
					end()
					label('ABA_do')
						print('ABA')
					end()
				});
				object('B', function () {
					spawn('BA')
					end()
					label('B_do')
						print('B')
					end()
				});
				object('BA', function () {
					wait(1)
					send('^/*/AA/<', 'A_do')		//All board entities that have AA as a child
					wait(1)
					send('</</</</</*', 'B_do')		//Board's parent should scope to itself
					wait(1)
					send('</BA/</</B', 'B_do')		//Self-scoping
					wait(1)
					send('</</A/*', 'AA_do')		//Send to all instances for a name scope
					wait(1)
					send('</</A/AB/ABA', 'ABA_do')	//Chained name scopes
					wait(1)
					send('</</A/AB/<>', 'AA_do')	//Siblings
					wait(1)
					terminate()
				});
			});
			board.run(function () {
				spawn('A')
				spawn('B')
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['A', 'B', 'B', 'AA', 'AA', 'ABA', 'AA', 'AA'].toString())
				done();
			});
			board.start();
		});

		it("should allow objects to join/leave groups and scope to them", function (done) {
			board.setup(function () {
				group('GroupA')
				group('GroupB')
				group('GroupC')

				object('A1', function () {
					join('GroupA')
					spawn('A2-B1')
					spawn('A2-B1')
					end()
					label('do')
						print('A1')
					end()
				});
				object('A2-B1', function () {
					join('GroupA')
					join('GroupB')
					end()
					label('do')
						print('A2-B1')
						leave('GroupB')
					end()
				});
			});
			board.run(function () {
				join('GroupC')
				spawn('A1')
				spawn('B1')
				wait(2)
				send('group=GroupB', 'do')
				wait(2)
				send('group=GroupA', 'do')
				wait(2)
				send('group=GroupB', 'do')
				wait(2)
				send('group=GroupC', 'do')
				end()
				label('do')
					print('C1')
					terminate()
				end()
			});
			board.finish(function () {
				expect(console.history.toString()).toEqual(['A2-B1', 'A2-B1', 'A2-B1', 'A2-B1', 'A1', 'C1'].toString())
				done();
			});
			board.start();
		});
	});
});