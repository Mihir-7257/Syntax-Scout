import tree_sitter
import tree_sitter_java as tsjava

lang = tree_sitter.Language(tsjava.language())
parser = tree_sitter.Parser(lang)
tree = parser.parse(bytes("class A { void test() {} }", "utf8"))

query = tree_sitter.Query(lang, "(method_declaration) @m")
cursor = tree_sitter.QueryCursor(query)
print('Testing cursor.matches(tree.root_node)')
print(cursor.matches(tree.root_node))
