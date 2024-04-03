// 1 -> 2
// custentity10
// 'custentity10'
// "custentity10"
export class List {
  items: Map<number, unknown>;
  list_length: number;

  constructor(){
    this.items = new Map();
    this.list_length = 0;
  }

  public static create(...values: unknown[]): List {
    // Do *not* construct any array literal ([]) in your solution.
    // Do *not* construct any arrays through new Array in your solution.
    // DO *not* use any of the Array.prototype methods in your solution.

    // You may use the destructuring and spreading (...) syntax from Iterable.
    
    let list = new List();
    
    for (let value of values) {
      list.items.set(list.list_length, value);
      list.list_length++;
    }
    
    return list;
  }

  public forEach(callback: (item: unknown) => unknown): void {
    let item: unknown;
    let i = 0;

    while (i < this.list_length) {
      item = this.items.get(i);
      callback(item);
      i++;    
    }
  }

  public push(item: unknown): number {
    this.items.set(this.list_length, item);
    this.list_length++;
    return this.list_length;
  }

  public append(list: List): List {
    list.forEach((item) => this.push(item));
    return this;
  }

  public concat(list_of_lists: List): List {
    list_of_lists.forEach((list) => this.append(list as List));
    return this;
  }

  public filter<Type>(predicate: (item: unknown) => boolean): List {
    let filtered_list = List.create();
    this.forEach((item) => {
      if (predicate(item)) {
        filtered_list.push(item)
      }
    })  
    return filtered_list;
  }

  public length(): number {
    return this.list_length;
  }

  public map<Type>(func: (item: unknown) => unknown): List {
    let mapped_list = List.create();
    this.forEach((item) => mapped_list.push(func(item)));
    return mapped_list;
  }

  public foldl<Type1, Type2>(func: (item: unknown, accumulator: Type2) => Type2, initial_accumulator: Type2): Type2 {
    let result = initial_accumulator;
    this.forEach((item) => {
      result = func(item, result);
      console.log(result);
    })
    return result;
  }
  
  public foldr<Type1, Type2>(func: (item: unknown, accumulator: Type2) => Type2, initial_accumulator: Type2): Type2 {
    let result = initial_accumulator;
    this.reverse().forEach((item) => {
      result = func(item, result);
    })
    return result;
  }

  public reverse(): List {
    let reversed_list = List.create();
    let i = this.list_length;

    while (i > 0) {
      i--;
      reversed_list.push(this.items.get(i));
    }
    return reversed_list;
  }

}

const list1 = List.create(1, 2, 3, 4);
let result = list1.foldl<number, number>((acc, el) => el / acc, 24);
console.log(result);