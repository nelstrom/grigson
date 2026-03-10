// Grigson chord chart parser
// This is a placeholder grammar. Rules will be filled in as the parser is built.

Song = lines:Line* { return { lines }; }

Line = text:$(!"\n" .)* "\n" { return text; }
