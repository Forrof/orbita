"""Conservative spelling variants; never new concepts or new score records."""
import re
import unicodedata

WORKS = {'films', 'books', 'novels', 'series', 'videogames', 'board-games', 'bands'}
LEXICAL = {'appliances', 'furniture', 'transport', 'menu', 'sports', 'drinks', 'desserts', 'market', 'mammals', 'birds', 'fish', 'invertebrates', 'plants', 'trees', 'jobs', 'wardrobe', 'instruments', 'tools', 'feelings', 'containers', 'sports-equipment', 'demonym', 'materials', 'disciplines', 'health', 'cancers', 'infections', 'mental-health', 'neurology', 'circulation', 'respiratory', 'digestive', 'skin', 'musculoskeletal', 'injuries', 'symptoms', 'phenomena', 'math', 'astronomy', 'dog-breeds', 'minerals', 'flowers', 'dances', 'musical-genres'}


def feminine_variants(word, identity, attested):
    if identity not in {'jobs', 'demonym'} or not word.islower():
        return set()
    tokens = word.split()
    def feminine(token):
        for ending, replacement in [('o', 'a'), ('or', 'ora'), ('án', 'ana'), ('és', 'esa'), ('ín', 'ina'), ('ón', 'ona')]:
            if token.endswith(ending):
                candidate = token[:-len(ending)] + replacement
                if candidate in attested:
                    return attested[candidate]
        return token
    head = feminine(tokens[0])
    if head == tokens[0]:
        return set()
    tail = tokens[1:]
    if not any(t in {'de', 'del', 'con', 'sin', 'a', 'para'} for t in tail):
        tail = [feminine(t) for t in tail]
    return {' '.join([head, *tail])}


def plural_variants(word, identity, attested):
    """Pluralize lexical heads only when each inflection is independently listed.

    Proper names and taxonomic Latin names are never inflected. For compounds,
    a preposition freezes its complement; otherwise every word must be attested.
    """
    if identity not in LEXICAL or not word.islower():
        return set()
    tokens = word.split()
    if not tokens:
        return set()
    def plural(token):
        proposed = token[:-1] + 'ces' if token.endswith('z') else token + ('s' if token[-1:] in 'aeiouáéíóú' else 'es')
        return attested.get(proposed.casefold())
    head = plural(tokens[0])
    if not head:
        return set()
    if len(tokens) == 1:
        return {head}
    if tokens[1] in {'de', 'del', 'con', 'sin', 'a', 'para'}:
        return {' '.join([head, *tokens[1:]])}
    if len(tokens) <= 3:
        rest = [plural(t) for t in tokens[1:]]
        if all(rest):
            return {' '.join([head, *rest])}
    return set()


def spelling_variants(word, identity):
    values = set()
    # Punctuation is often omitted in names (Spider-Man, O'Neal, Wall-E).
    if re.search(r"[’'\-‐‑]", word):
        values.add(re.sub(r"[’'\-‐‑]", '', word))
    if '&' in word:
        values.add(word.replace('&', 'y'))
        values.add(word.replace('&', 'and'))
    family = 'films' if identity.startswith('films-') else 'series' if identity.startswith('series-') else identity
    if family in WORKS:
        # Only a leading title article, and only titles with a meaningful tail.
        short = re.sub(r'^(?:el|la|los|las|un|una|unos|unas|the|a|an)\s+', '', word, flags=re.I)
        if short != word and len(short) >= 4:
            values.add(short)
    return values - {word}
