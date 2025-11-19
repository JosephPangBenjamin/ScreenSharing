import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";


// 用atomWithStorage创建持久化原子， 存储的值必须可序列化（避免函数，循环引用等）
/**
 * 内置localStorage读写逻辑，自动处理序列化 / 反序列化。
  避免手动处理错误和更新逻辑，符合 Jotai 最佳实践。
  支持自定义存储（如sessionStorage或 IndexedDB），扩展性强
 */
export const todosAtom = atomWithStorage('todos', []);

/**
 * 手动实现
 * 
 * 
 * // 工具函数：从localStorage读取初始值（只在原子初始化时调用一次）
const getInitialTodos = () => {
  try {
    // 1. 尝试从localStorage读取
    const storedTodos = localStorage.getItem('todos');
    // 2. 有值则解析JSON，无值则返回默认空数组
    return storedTodos ? JSON.parse(storedTodos) : [];
  } catch (err) {
    // 处理异常（如JSON格式错误、localStorage不可用）
    console.error('读取localStorage失败：', err);
    return []; // 失败时返回默认值
  }
};

// ✅ 正确的todosAtom：手动实现持久化
export const todosAtom = atom(
  // 1. 读取函数：返回当前状态（初始值由getInitialTodos提供）
  getInitialTodos(),

  // 2. 更新函数：接收新的todos列表，持久化后返回新值
  (get, set, newTodos) => { // newTodos是更新时传入的新列表
    try {
      // 先将新值存入localStorage（持久化）
      localStorage.setItem('todos', JSON.stringify(newTodos));
    } catch (err) {
      // 处理存储失败（如超出容量）
      console.error('写入localStorage失败：', err);
    }
    // 返回新值，Jotai会自动用这个值更新当前原子
    return newTodos;
  }
);
 */



/**
 * 筛选条件原子 'all' | 'active' | 'completed'
 */
export const filterAtom = atom('all');

/**
 * 优先级筛选原子 'all' | 'high' | 'medium' | 'low'
 */
export const priorityFilterAtom = atom('all');

export const filteredTodosAtom = atom((get) => {
    const todos = get(todosAtom);
    const statusFilter = get(filterAtom);
    const priorityFilter = get(priorityFilterAtom);

    // 先对状态筛选
    let result = todos.filter(todo => {
        if (statusFilter === "active") return !todo.completed;
        if (statusFilter === "completed") return todo.completed;
        return true;
    });


    // 按优先级筛选
    if (priorityFilter !== 'all') {
        result = result.filter(todo => todo.priority === priorityFilter);
    }

    return result;
});

/**
 * 最佳实践：
 * 用派生原子替代手动维护筛选后的数据，避免 “源数据” 和 “筛选数据” 不一致的问题。
 * 筛选逻辑集中在原子中，组件只需关注渲染，符合 “关注点分离”。
 */

/**
 * 派生原子
 * 惰性计算：只有当依赖的原子（todosAtom或filterAtom）变化时，才会重新计算。
 * 只读性：默认派生原子是只读的（只有get函数），若需修改可添加更新函数（但此处无需）。
 */
export const filterdTodosAtom = atom((get) => {
    const todos = get(todosAtom);
    const filter = get(filterAtom);

    switch (filter) {
        case "active":
            return todos.filter((todo) => !todo.completed);
        case "completed":
            return todos.filter((todo) => todo.completed);
        default:
            return todos;
    }
});

export const activeCountAtom = atom((get) => {
    const todos = get(todosAtom);
    return todos.filter(todo => !todo.completed).length;
});

export const completedCountAtom = atom((get) => {
    const todos = get(todosAtom);
    const activeCount = get(activeCountAtom);
    return todos.length - activeCount;
})