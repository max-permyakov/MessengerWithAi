
import re
from copy import deepcopy


MAX_LEN = 4096

def _is_escaped(text, pos):
    # считает сколько подряд слэшей перед позицией
    cnt = 0
    i = pos - 1
    while i >= 0 and text[i] == '\\':
        cnt += 1
        i -= 1
    return (cnt % 2) == 1  # если нечётное - символ экранирован

def _closing_for_stack(stack):
    # для каждого открытого токена возвращаем строку закрытия (в обратном порядке)
    mapping = {
        '```': '```',
        '`': '`',
        '*': '*',
        '**': '**',
        '***': '***',
        '___': '___',
        '``':'``',
        '_':'_',
        '__': '__',
        '[': ']',
        '(': ')',
        '{': '}',
        '~': '~',
        '~~': '~~'
    }
    return ''.join(mapping[t] for t in reversed(stack))

def _opening_for_stack(stack):
    return ''.join(stack)  # просто конкатенация открывающих токенов

def split_markdown_preserve(text, limit=MAX_LEN):
    """
    Возвращает список кусочков текста, каждый <= limit, с попытками не разорвать
    markdown-энтити. На границах дублирует необходимые символы.
    """
    parts = []
    pos = 0
    L = len(text)

    while pos < L:
        remaining = text[pos:pos+limit]
        # если остаток короче лимита, присылаем как есть
        if len(remaining) <= limit and pos + len(remaining) == L:
            parts.append(remaining)
            break

        # будем сканировать remaining и фиксировать стек в каждой позиции
        stack = []
        stacks_at = []  # стек (копия) на позиции i (позиция соответствует i символам прочитано)
        last_safe = 0   # last index (в символах от начала remaining) где стек пуст
        i = 0
        while i < len(remaining):
            ch = remaining[i]

            # тройные/многократные backticks
            if ch == '`' and not _is_escaped(remaining, i):
                # посчитаем подряд бэктики
                j = i
                while j < len(remaining) and remaining[j] == '`':
                    j += 1
                count = j - i
                token = '```' if count >= 3 else '`'
                # поведение: если в стеке уже '```' и встретили '```' -> закрываем
                if stack and stack[-1] == token:
                    stack.pop()
                else:
                    # если мы внутри '```' и встречаем одиночный '`', не закрываем
                    if token == '`' and stack and stack[-1] == '```':
                        # treat as normal char
                        pass
                    else:
                        stack.append(token)
                # advance i на count
                i = j
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            # escape
            if ch == '\\':
                # consume backslash and next char as literal
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            # bold/italic markers
            if ch in ('*', '_') and not _is_escaped(remaining, i):
                token = ch
                if stack and stack[-1] == token:
                    stack.pop()
                else:
                    stack.append(token)
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            # link label [
            if ch == '[' and not _is_escaped(remaining, i):
                stack.append('[')
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            if ch == ']' and not _is_escaped(remaining, i):
                # close '[' if верхний элемент '['
                if stack and stack[-1] == '[':
                    stack.pop()
                    # check next char: if '(' then we'll push '(' when we see it
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            # парные скобки для URL (после ])
            if ch == '(' and not _is_escaped(remaining, i):
                # как упрощение: если прямо перед '(' был ']' в тексте, то это старт URL -> push '('
                prev = remaining[i-1] if i-1 >= 0 else None
                if prev == ']':
                    stack.append('(')
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            if ch == ')' and not _is_escaped(remaining, i):
                if stack and stack[-1] == '(':
                    stack.pop()
                i += 1
                stacks_at.append(deepcopy(stack))
                if not stack:
                    last_safe = i
                continue

            # обычный символ
            i += 1
            stacks_at.append(deepcopy(stack))
            if not stack:
                last_safe = i

        # если на конце remaining стек пуст и при этом remaining длина <= limit — безопасно
        if not stack:
            # можем отправить полный remaining если хотим, но лучше отправлять до last_safe чтобы избежать проблем
            # если last_safe == len(remaining) — целиком безопасно
            if last_safe == len(remaining):
                chunk = remaining
                parts.append(chunk)
                pos += len(chunk)
                continue
            else:
                # отправляем безопасный префикс
                chunk = remaining[:last_safe]
                parts.append(chunk)
                pos += len(chunk)
                continue

        # тут стек НЕ пуст -> ищем наиболее правую позицию j <= len(remaining) где стек пуст или где можно добавить закрытия
        # соберём для каждого j стек stacks_at[j-1] (т.е. после j символов)
        chosen_j = None
        chosen_stack = None
        # 1) предпочитаем позицию, где стек пуст
        for j in range(len(stacks_at)-1, -1, -1):
            if not stacks_at[j]:
                chosen_j = j+1  # количество символов
                chosen_stack = []
                break

        if chosen_j is not None:
            # нашли безопасную позицию
            chunk = remaining[:chosen_j]
            parts.append(chunk)
            pos += chosen_j
            continue

        # 2) если нет пустой позиции, попробуем найти j где после добавления закрывающих строчка поместится в limit
        found = False
        for j in range(len(stacks_at)-1, -1, -1):
            s = stacks_at[j]
            closing = _closing_for_stack(s)
            if (j + len(closing)) <= limit:
                # можем врезать сюда закрытия
                chunk = remaining[:j] + closing
                parts.append(chunk)
                # следующий кусок должен начать с открывающих в том же порядке
                opening = _opening_for_stack(s)
                # вставим открывающие в начало оставшегося текста
                # но чтобы не потерять исходный символы, будем изменять text:
                # new remaining starts with opening + original tail
                tail = remaining[j:]
                # модифицируем исходный текст (вставляя opening перед tail)
                text = text[:pos] + remaining  # reconstruct full remaining for correct pos change
                # replace the remainder in original text with opening + tail
                text = text[:pos] + opening + tail
                # update global text and L accordingly
                # чтобы корректно работать с внешним циклом, заменим переменные:
                # новый общий текст = text; L обновлен
                # установим original text to this and set pos to pos + len(chunk)
                # но проще: мы будем изменять переменные и continue outer while by adjusting pos and L and text.
                # To keep code simpler (avoid complex in-place string mutation), вместо вставки прямо в text
                # мы вычислим new_remaining explicitly and set text = prefix + opening + tail + suffix...
                # Однако чтобы избежать сложности, проще: build next_text = opening + tail + rest_of_original_text_after_remaining
                rest_after_remaining = text[pos+len(remaining):]  # equals original after remaining
                new_remaining_full = opening + tail + rest_after_remaining
                # replace the original total text from pos with new_remaining_full
                text = text[:pos] + new_remaining_full
                # update L and reset variables for next iteration
                L = len(text)
                # advance pos by length of appended chunk
                pos += len(chunk)
                # adjust the outer text variable (so while loop uses updated text)
                # also update remaining for next loop automatically via slice at top
                found = True
                break
        if found:
            continue

        # 3) Последний ресурс: не удалось аккуратно закрыть — экранируем все markdown-спецсимволы в пределах limit и отправляем такой кусок.
        # экранируем в remaining все `*_[]()`
        esc = re.sub(r'([\\`\*\_\[\]\(\)])', r'\\\1', remaining[:limit])
        parts.append(esc)
        pos += len(remaining[:limit])

    return parts
