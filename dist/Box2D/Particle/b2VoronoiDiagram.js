/*
 * Copyright (c) 2013 Google, Inc.
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */
System.register(["../Common/b2Settings", "../Common/b2Math", "./b2StackQueue"], function (exports_1, context_1) {
    "use strict";
    var b2Settings_1, b2Math_1, b2StackQueue_1, b2VoronoiDiagram, b2VoronoiDiagram_Generator, b2VoronoiDiagram_Task;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (b2Settings_1_1) {
                b2Settings_1 = b2Settings_1_1;
            },
            function (b2Math_1_1) {
                b2Math_1 = b2Math_1_1;
            },
            function (b2StackQueue_1_1) {
                b2StackQueue_1 = b2StackQueue_1_1;
            }
        ],
        execute: function () {
            /**
             * A field representing the nearest generator from each point.
             */
            b2VoronoiDiagram = class b2VoronoiDiagram {
                constructor(generatorCapacity) {
                    this.m_generatorCapacity = 0;
                    this.m_generatorCount = 0;
                    this.m_countX = 0;
                    this.m_countY = 0;
                    this.m_diagram = [];
                    this.m_generatorBuffer = b2Settings_1.b2MakeArray(generatorCapacity, (index) => new b2VoronoiDiagram_Generator());
                    this.m_generatorCapacity = generatorCapacity;
                }
                /**
                 * Add a generator.
                 *
                 * @param center the position of the generator.
                 * @param tag a tag used to identify the generator in callback functions.
                 * @param necessary whether to callback for nodes associated with the generator.
                 */
                AddGenerator(center, tag, necessary) {
                    // DEBUG: b2Assert(this.m_generatorCount < this.m_generatorCapacity);
                    const g = this.m_generatorBuffer[this.m_generatorCount++];
                    g.center.Copy(center);
                    g.tag = tag;
                    g.necessary = necessary;
                }
                /**
                 * Generate the Voronoi diagram. It is rasterized with a given
                 * interval in the same range as the necessary generators exist.
                 *
                 * @param radius the interval of the diagram.
                 * @param margin margin for which the range of the diagram is extended.
                 */
                Generate(radius, margin) {
                    const inverseRadius = 1 / radius;
                    const lower = new b2Math_1.b2Vec2(+b2Settings_1.b2_maxFloat, +b2Settings_1.b2_maxFloat);
                    const upper = new b2Math_1.b2Vec2(-b2Settings_1.b2_maxFloat, -b2Settings_1.b2_maxFloat);
                    let necessary_count = 0;
                    for (let k = 0; k < this.m_generatorCount; k++) {
                        const g = this.m_generatorBuffer[k];
                        if (g.necessary) {
                            b2Math_1.b2Vec2.MinV(lower, g.center, lower);
                            b2Math_1.b2Vec2.MaxV(upper, g.center, upper);
                            ++necessary_count;
                        }
                    }
                    if (necessary_count === 0) {
                        ///debugger;
                        this.m_countX = 0;
                        this.m_countY = 0;
                        return;
                    }
                    lower.x -= margin;
                    lower.y -= margin;
                    upper.x += margin;
                    upper.y += margin;
                    this.m_countX = 1 + Math.floor(inverseRadius * (upper.x - lower.x));
                    this.m_countY = 1 + Math.floor(inverseRadius * (upper.y - lower.y));
                    ///  m_diagram = (Generator**) m_allocator->Allocate(sizeof(Generator*) * m_countX * m_countY);
                    ///  for (int32 i = 0; i < m_countX * m_countY; i++)
                    ///  {
                    ///    m_diagram[i] = NULL;
                    ///  }
                    this.m_diagram = []; // b2MakeArray(this.m_countX * this.m_countY, (index) => null);
                    // (4 * m_countX * m_countY) is the queue capacity that is experimentally
                    // known to be necessary and sufficient for general particle distributions.
                    const queue = new b2StackQueue_1.b2StackQueue(4 * this.m_countX * this.m_countY);
                    for (let k = 0; k < this.m_generatorCount; k++) {
                        const g = this.m_generatorBuffer[k];
                        ///  g.center = inverseRadius * (g.center - lower);
                        g.center.SelfSub(lower).SelfMul(inverseRadius);
                        const x = Math.floor(g.center.x);
                        const y = Math.floor(g.center.y);
                        if (x >= 0 && y >= 0 && x < this.m_countX && y < this.m_countY) {
                            queue.Push(new b2VoronoiDiagram_Task(x, y, x + y * this.m_countX, g));
                        }
                    }
                    while (!queue.Empty()) {
                        const task = queue.Front();
                        const x = task.m_x;
                        const y = task.m_y;
                        const i = task.m_i;
                        const g = task.m_generator;
                        queue.Pop();
                        if (!this.m_diagram[i]) {
                            this.m_diagram[i] = g;
                            if (x > 0) {
                                queue.Push(new b2VoronoiDiagram_Task(x - 1, y, i - 1, g));
                            }
                            if (y > 0) {
                                queue.Push(new b2VoronoiDiagram_Task(x, y - 1, i - this.m_countX, g));
                            }
                            if (x < this.m_countX - 1) {
                                queue.Push(new b2VoronoiDiagram_Task(x + 1, y, i + 1, g));
                            }
                            if (y < this.m_countY - 1) {
                                queue.Push(new b2VoronoiDiagram_Task(x, y + 1, i + this.m_countX, g));
                            }
                        }
                    }
                    for (let y = 0; y < this.m_countY; y++) {
                        for (let x = 0; x < this.m_countX - 1; x++) {
                            const i = x + y * this.m_countX;
                            const a = this.m_diagram[i];
                            const b = this.m_diagram[i + 1];
                            if (a !== b) {
                                queue.Push(new b2VoronoiDiagram_Task(x, y, i, b));
                                queue.Push(new b2VoronoiDiagram_Task(x + 1, y, i + 1, a));
                            }
                        }
                    }
                    for (let y = 0; y < this.m_countY - 1; y++) {
                        for (let x = 0; x < this.m_countX; x++) {
                            const i = x + y * this.m_countX;
                            const a = this.m_diagram[i];
                            const b = this.m_diagram[i + this.m_countX];
                            if (a !== b) {
                                queue.Push(new b2VoronoiDiagram_Task(x, y, i, b));
                                queue.Push(new b2VoronoiDiagram_Task(x, y + 1, i + this.m_countX, a));
                            }
                        }
                    }
                    while (!queue.Empty()) {
                        const task = queue.Front();
                        const x = task.m_x;
                        const y = task.m_y;
                        const i = task.m_i;
                        const k = task.m_generator;
                        queue.Pop();
                        const a = this.m_diagram[i];
                        const b = k;
                        if (a !== b) {
                            const ax = a.center.x - x;
                            const ay = a.center.y - y;
                            const bx = b.center.x - x;
                            const by = b.center.y - y;
                            const a2 = ax * ax + ay * ay;
                            const b2 = bx * bx + by * by;
                            if (a2 > b2) {
                                this.m_diagram[i] = b;
                                if (x > 0) {
                                    queue.Push(new b2VoronoiDiagram_Task(x - 1, y, i - 1, b));
                                }
                                if (y > 0) {
                                    queue.Push(new b2VoronoiDiagram_Task(x, y - 1, i - this.m_countX, b));
                                }
                                if (x < this.m_countX - 1) {
                                    queue.Push(new b2VoronoiDiagram_Task(x + 1, y, i + 1, b));
                                }
                                if (y < this.m_countY - 1) {
                                    queue.Push(new b2VoronoiDiagram_Task(x, y + 1, i + this.m_countX, b));
                                }
                            }
                        }
                    }
                }
                /**
                 * Enumerate all nodes that contain at least one necessary
                 * generator.
                 */
                GetNodes(callback) {
                    for (let y = 0; y < this.m_countY - 1; y++) {
                        for (let x = 0; x < this.m_countX - 1; x++) {
                            const i = x + y * this.m_countX;
                            const a = this.m_diagram[i];
                            const b = this.m_diagram[i + 1];
                            const c = this.m_diagram[i + this.m_countX];
                            const d = this.m_diagram[i + 1 + this.m_countX];
                            if (b !== c) {
                                if (a !== b && a !== c &&
                                    (a.necessary || b.necessary || c.necessary)) {
                                    callback(a.tag, b.tag, c.tag);
                                }
                                if (d !== b && d !== c &&
                                    (a.necessary || b.necessary || c.necessary)) {
                                    callback(b.tag, d.tag, c.tag);
                                }
                            }
                        }
                    }
                }
            };
            exports_1("b2VoronoiDiagram", b2VoronoiDiagram);
            b2VoronoiDiagram_Generator = class b2VoronoiDiagram_Generator {
                constructor() {
                    this.center = new b2Math_1.b2Vec2();
                    this.tag = 0;
                    this.necessary = false;
                }
            };
            exports_1("b2VoronoiDiagram_Generator", b2VoronoiDiagram_Generator);
            b2VoronoiDiagram_Task = class b2VoronoiDiagram_Task {
                constructor(x, y, i, g) {
                    this.m_x = x;
                    this.m_y = y;
                    this.m_i = i;
                    this.m_generator = g;
                }
            };
            exports_1("b2VoronoiDiagram_Task", b2VoronoiDiagram_Task);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYjJWb3Jvbm9pRGlhZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL0JveDJEL1BhcnRpY2xlL2IyVm9yb25vaURpYWdyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7Ozs7Ozs7Ozs7Ozs7Ozs7OztZQVNIOztlQUVHO1lBQ0gsbUJBQUEsTUFBYSxnQkFBZ0I7Z0JBUTNCLFlBQVksaUJBQXlCO29CQU45Qix3QkFBbUIsR0FBRyxDQUFDLENBQUM7b0JBQ3hCLHFCQUFnQixHQUFHLENBQUMsQ0FBQztvQkFDckIsYUFBUSxHQUFHLENBQUMsQ0FBQztvQkFDYixhQUFRLEdBQUcsQ0FBQyxDQUFDO29CQUNiLGNBQVMsR0FBaUMsRUFBRSxDQUFDO29CQUdsRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsd0JBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7b0JBQ3JHLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQztnQkFDL0MsQ0FBQztnQkFFRDs7Ozs7O21CQU1HO2dCQUNJLFlBQVksQ0FBQyxNQUFjLEVBQUUsR0FBVyxFQUFFLFNBQWtCO29CQUNqRSxxRUFBcUU7b0JBQ3JFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO29CQUMxRCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdEIsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7b0JBQ1osQ0FBQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQzFCLENBQUM7Z0JBRUQ7Ozs7OzttQkFNRztnQkFDSSxRQUFRLENBQUMsTUFBYyxFQUFFLE1BQWM7b0JBQzVDLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUM7b0JBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBTSxDQUFDLENBQUMsd0JBQVcsRUFBRSxDQUFDLHdCQUFXLENBQUMsQ0FBQztvQkFDckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFNLENBQUMsQ0FBQyx3QkFBVyxFQUFFLENBQUMsd0JBQVcsQ0FBQyxDQUFDO29CQUNyRCxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7b0JBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQzlDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDcEMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFOzRCQUNmLGVBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3BDLGVBQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3BDLEVBQUUsZUFBZSxDQUFDO3lCQUNuQjtxQkFDRjtvQkFDRCxJQUFJLGVBQWUsS0FBSyxDQUFDLEVBQUU7d0JBQ3pCLFlBQVk7d0JBQ1osSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7d0JBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO3dCQUNsQixPQUFPO3FCQUNSO29CQUNELEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDO29CQUNsQixLQUFLLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQztvQkFDbEIsS0FBSyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUM7b0JBQ2xCLEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDO29CQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BFLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEUsK0ZBQStGO29CQUMvRixvREFBb0Q7b0JBQ3BELE1BQU07b0JBQ04sMkJBQTJCO29CQUMzQixNQUFNO29CQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUMsK0RBQStEO29CQUVwRix5RUFBeUU7b0JBQ3pFLDJFQUEyRTtvQkFDM0UsTUFBTSxLQUFLLEdBQUcsSUFBSSwyQkFBWSxDQUF3QixDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3pGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQzlDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDcEMsbURBQW1EO3dCQUNuRCxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQy9DLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDakMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRTs0QkFDOUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ3ZFO3FCQUNGO29CQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUU7d0JBQ3JCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDM0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQzt3QkFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQzt3QkFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQzt3QkFDbkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQzt3QkFDM0IsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFOzRCQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dDQUNULEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQzNEOzRCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQ0FDVCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDdkU7NEJBQ0QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUU7Z0NBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQzNEOzRCQUNELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFO2dDQUN6QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDdkU7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTs0QkFDMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDOzRCQUNoQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUM1QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dDQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUMzRDt5QkFDRjtxQkFDRjtvQkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFOzRCQUN0QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7NEJBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzVCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dDQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDdkU7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDckIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUMzQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO3dCQUNuQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO3dCQUNuQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO3dCQUNuQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO3dCQUMzQixLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDNUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNaLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTs0QkFDWCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQzFCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQzs0QkFDN0IsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDOzRCQUM3QixJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0NBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ3RCLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtvQ0FDVCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lDQUMzRDtnQ0FDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0NBQ1QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7aUNBQ3ZFO2dDQUNELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFO29DQUN6QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lDQUMzRDtnQ0FDRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRTtvQ0FDekIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7aUNBQ3ZFOzZCQUNGO3lCQUNGO3FCQUNGO2dCQUNILENBQUM7Z0JBRUQ7OzttQkFHRztnQkFDSSxRQUFRLENBQUMsUUFBdUM7b0JBQ3JELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTt3QkFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOzRCQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7NEJBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzVCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQzVDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBQ2hELElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQ0FDWCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7b0NBQ3BCLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQ0FDN0MsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUNBQy9CO2dDQUNELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztvQ0FDcEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFO29DQUM3QyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQ0FDL0I7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7Z0JBQ0gsQ0FBQzthQUNGLENBQUE7O1lBU0QsNkJBQUEsTUFBYSwwQkFBMEI7Z0JBQXZDO29CQUNTLFdBQU0sR0FBVyxJQUFJLGVBQU0sRUFBRSxDQUFDO29CQUM5QixRQUFHLEdBQVcsQ0FBQyxDQUFDO29CQUNoQixjQUFTLEdBQVksS0FBSyxDQUFDO2dCQUNwQyxDQUFDO2FBQUEsQ0FBQTs7WUFFRCx3QkFBQSxNQUFhLHFCQUFxQjtnQkFLaEMsWUFBWSxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUE2QjtvQkFDeEUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ2IsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ2IsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQ2IsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZCLENBQUM7YUFDRixDQUFBIn0=