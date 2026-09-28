"""Add concise useful copy to thin pages. Existing <title> values are never changed."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXTRA = {
    "editorial.html": '<!-- SEO-EXTRA-COPY --><p>Редакционная проверка не подменяет автора и не делает все публикации одинаковыми по тону. Её задача — отдельно контролировать факты, которые читатель может использовать как практическую рекомендацию, сохраняя при этом понятный живой язык материала.</p><!-- /SEO-EXTRA-COPY -->',
    "editorial-policy.html": '<!-- SEO-EXTRA-COPY --><p>Если тема допускает разные профессиональные подходы, редакция старается обозначить границы рекомендации и не выдавать один частный вариант за универсальное правило. Для изменяющихся норм и официальных рекомендаций важна актуальность источника на дату подготовки или обновления материала.</p><!-- /SEO-EXTRA-COPY -->',
    "contacts.html": '<!-- SEO-EXTRA-COPY --><h2>Что указать в письме</h2><p>Чтобы обращение можно было проверить без догадок, укажите адрес страницы, суть вопроса и, если речь идёт об ошибке, точную цитату или описание спорного места. Для предложений материалов полезно кратко описать тему и объяснить, почему она подходит аудитории ProVkus. Персональные данные, которые не нужны для ответа на редакционный вопрос, отправлять не требуется.</p><p>Если вопрос относится к конкретному автору, всё равно можно писать на общий редакционный адрес: ссылка на публикацию позволит определить нужный материал. Для технических замечаний к странице приложите адрес URL и описание того, что отображается неверно.</p><!-- /SEO-EXTRA-COPY -->',
    "food-safety.html": '<!-- SEO-EXTRA-COPY --><p>Редакция также различает общий информационный материал и индивидуальную медицинскую рекомендацию: публикации ProVkus объясняют безопасное обращение с едой в бытовых условиях, но не заменяют консультацию врача при симптомах отравления, аллергической реакции или другом ухудшении самочувствия.</p><!-- /SEO-EXTRA-COPY -->',
    "grams-spoons-cups.html": '<!-- SEO-EXTRA-COPY --><p>Если продукт отсутствует в списке конвертера, безопаснее выбрать близкую меру по объёму и затем проверить результат весами, а не переносить плотность другого ингредиента автоматически.</p><!-- /SEO-EXTRA-COPY -->',
    "portion-calculator.html": '<!-- SEO-EXTRA-COPY --><p>После пересчёта проверьте не только числа, но и посуду: для большой партии может понадобиться более вместительная форма или приготовление в несколько заходов. Это помогает сохранить исходную толщину слоя и приблизить условия к тем, на которые рассчитан рецепт.</p><!-- /SEO-EXTRA-COPY -->',
}


def insert(path: Path, block: str) -> bool:
    source = path.read_text('utf-8')
    if 'SEO-EXTRA-COPY' in source:
        return False
    marker = '</section>' if 'class="seo-supporting-copy"' in source else '</main>'
    if marker == '</section>':
        # Put the extra copy inside the last supporting-copy section.
        pos = source.rfind('</section>')
        if pos < 0:
            return False
        source = source[:pos] + block + source[pos:]
    else:
        source = source.replace(marker, block + marker, 1)
    path.write_text(source, 'utf-8')
    return True


def main():
    changed=[]
    for name, block in EXTRA.items():
        path=ROOT/name
        if path.exists() and insert(path, block):
            changed.append(name)
    print(f'Added useful depth to {len(changed)} pages: {changed}')


if __name__ == '__main__':
    main()
