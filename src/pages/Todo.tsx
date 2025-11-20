import React, { useCallback } from "react";
import { TodoInput } from '../components/TodoInput.js';
import { TodoItem } from '../components/TodoItem.js';
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { filterdTodosAtom, todosAtom } from "../store/todoAtoms.ts";
import FilterButtons from "../components/FilterButtons.tsx";
import Stats from "../components/Status.tsx";
import ClearCompleted from "../components/ClearCompleted.tsx";
import PriorityFilter from "../components/PriorityFilter.tsx";
const Todo: React.FC = () => {

    /**
     * useAtom(atom)返回[value, setValue]，与useState用法类似，但值是全局共享的。
     * 任何组件使用useAtom(todosAtom)都会获取到相同的状态，且一处更新，处处同步。
     */
    const setTodos = useSetAtom(todosAtom);
    const filteredTodos = useAtomValue(filterdTodosAtom);

    const addTodo = (text: string) => {
        const newTodo = {
            id: Date.now(),
            text,
            priority: 'medium',
            completed: false,
        };
        setTodos((prev) => [...prev, newTodo]);
        // 是组件更新后调用自定义hook呢还是先调用自定义hook？？？
    };

    /**
     * useCallback缓存函数引用，依赖数组不变时返回同一个函数。
       配合函数式更新（setTodos(prev => ...)），避免将todos加入依赖数组（减少函数重新创建的频率）。
     */
    const toggleTodo = useCallback((id: number) => {
        setTodos((prev: any) => prev.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
    }, [setTodos]);

    // useCallback缓存函数引用，依赖数组不变时返回同一个函数。
    // 配合函数式更新（setTodos(prev => ...)），避免将todos加入依赖数组（减少函数重新创建的频率）
    const deleteTodo = useCallback((id: number) => {
        setTodos((prevTodos: any) => prevTodos.filter((todo: any) => todo.id !== id));
    }, [setTodos]);

    const updateTodoText = useCallback((id: number, newText: string) => {
        setTodos(prev => {
            return prev.map(todo => todo.id === id ? { ...todo, text: newText } : todo);
        });
    }, []);

    const updateTodoPriority = useCallback((id: number, priority: string) => {
        setTodos(prev => {
            return prev.map(todo => todo.id === id ? { ...todo, priority } : todo);
        })
    }, []);

    return <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>

        <TodoInput onAddTodo={addTodo} />
        <FilterButtons />
        <PriorityFilter />
        {filteredTodos.map((todo) => (
            <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUpdate={updateTodoText}
                onPriorityChange={updateTodoPriority}
            />
        ))}
        <ClearCompleted />
        <Stats />
    </div>
}

export default Todo;

/**
 * Todo 应用已具备完整功能
 * 添加、删除、标记待办
 * 按状态筛选
 * 本地持久化
 * 性能优化（缓存组件和函数）
 * 编辑待办事项（双击进入编辑模式）
 * 清除已完成待办
 * 待办优先级设置（高/中/低）
 * 截止日志选择
 * 性能优化（批量操作与虚拟列表）
 * 
 * 
 * 
 * 组件设计：拆分单一职责组件（TodoInput、TodoItem等），通过 props 传递数据和回调。
 * 自定义 Hook：useLocalStorage封装本地存储逻辑，遵循use命名规则和 Hooks 调用规则。
 * Jotai 状态管理：用原子（todosAtom、filterAtom）存储状态，派生原子（filteredTodosAtom、activeCountAtom）处理计算逻辑，实现跨组件共享。
 * 性能优化：React.memo缓存组件，useCallback缓存函数，useAtomValue/useSetAtom减少重渲染（为什么会减少重渲染）
 */