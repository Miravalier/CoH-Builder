const binaryOperatorsByPriority = [
    new Set(["*", "/", "%"]),
    new Set(["+", "-"]),
    new Set([">", ">=", "<", "<="]),
    new Set(["==", "!=", "eq"]),
    new Set(["&&"]),
    new Set(["||"]),
];

const functionOperators = {
    "pow": 2,
    "minmax": 3,
};

const unaryOperators = new Set([
    "!", "negate",
]);

const binaryOperators = new Set([
    "eq", "!=", "==", "||", "&&", "<", ">", "<=", ">=", "+", "-", "*", "/", "%",
]);

const commutativeOperators = new Set([
    "||", "!=", "==", "&&", "eq", "+", "*",
]);


enum ExprState {
    SEEKING,
    PARSING_TOKEN,
    PARSING_SUBEXPR,
    PARSING_FUNC,
};


function isSpace(character: string): boolean {
    return (character == " " || character == "\t" || character == "\n" || character == "\r");
}


export abstract class Expression {
    abstract toRpn(): string;
    abstract toString(): string;

    static fromRpn(rpn: string): Expression {
        const stack: Expression[] = [];
        for (const token of rpn.split(/\s+/)) {
            // Function operators
            if (token in functionOperators) {
                const operandCount = functionOperators[token];
                const operands = [];
                if (stack.length < operandCount) {
                    throw Error(`not enough operands in RPN expression for function operator '${token}'`);
                }
                for (let i=0; i < operandCount; i++) {
                    operands.unshift(stack.pop());
                }
                stack.push(new FunctionOperator(token, operands));
            }
            // Binary operators
            else if (binaryOperators.has(token)) {
                if (stack.length < 2) {
                    throw Error(`not enough operands in RPN expression for binary operator '${token}'`);
                }
                const b_operand = stack.pop();
                const a_operand = stack.pop();
                stack.push(new BinaryOperator(token, a_operand, b_operand));
            }
            // Unary operators
            else if (unaryOperators.has(token) || token.endsWith(">") || token.endsWith("?")) {
                if (stack.length < 1) {
                    throw Error(`not enough operands in RPN expression for unary operator '${token}'`);
                }
                stack.push(new UnaryOperator(token, stack.pop()));
            }
            // Tokens
            else {
                stack.push(new Token(token));
            }
        }
        if (stack.length == 0) {
            return null;
        }
        else if (stack.length > 1) {
            console.error(stack);
            throw Error(`not enough operators in RPN expression '${rpn}'`);
        }

        return stack[0];
    }

    static fromString(expr: string): Expression {
        // Tokenize string
        let functionName: string = "";
        let functionArguments: Expression[] = [];
        let tokens: Expression[] = [];
        let workingToken = "";
        let depth = 0;
        let state = ExprState.SEEKING;
        for (let i=0; i < expr.length; i++) {
            // Resolve seeking state, can fall into other states
            if (state == ExprState.SEEKING) {
                if (isSpace(expr[i])) {
                    continue;
                }
                else if (expr[i] == '(') {
                    state = ExprState.PARSING_SUBEXPR;
                    depth = 1;
                    i++;
                }
                else {
                    state = ExprState.PARSING_TOKEN;
                }
            }
            // Can fall into PARSING_SUBEXPR or PARSING_FUNC by hitting a ( with no space
            if (state == ExprState.PARSING_TOKEN) {
                if (isSpace(expr[i])) {
                    tokens.push(new Token(workingToken));
                    workingToken = "";
                    state = ExprState.SEEKING;
                }
                else if (expr[i] == '(') {
                    if (workingToken in functionOperators) {
                        functionName = workingToken;
                        workingToken = "";
                        state = ExprState.PARSING_FUNC;
                    }
                    else {
                        tokens.push(new Token(workingToken));
                        workingToken = "";
                        state = ExprState.PARSING_SUBEXPR;
                    }
                    depth = 1;
                    i++;
                }
                else {
                    workingToken += expr[i];
                }
            }
            // Recursively resolve subexprs
            if (state == ExprState.PARSING_SUBEXPR) {
                if (expr[i] == ")") {
                    depth -= 1;
                    if (depth == 0) {
                        tokens.push(Expression.fromString(workingToken));
                        workingToken = "";
                        state = ExprState.SEEKING;
                        continue;
                    }
                }
                else if (expr[i] == "(") {
                    depth += 1;
                }
                workingToken += expr[i];
            }
            // Parse each comma separated parameter as a subexpr
            else if (state == ExprState.PARSING_FUNC) {
                if (expr[i] == ")") {
                    depth -= 1;
                    if (depth == 0) {
                        // Function is closed, check parameter count
                        functionArguments.push(Expression.fromString(workingToken));
                        workingToken = "";
                        if (functionOperators[functionName] != functionArguments.length) {
                            throw Error(`function '${functionName}' requires ${functionOperators[functionName]} operands, received ${functionArguments.length}`);
                        }
                        tokens.push(new FunctionOperator(functionName, functionArguments));
                        functionName = "";
                        functionArguments = [];
                        state = ExprState.SEEKING;
                        continue;
                    }
                }
                else if (expr[i] == "(") {
                    depth += 1;
                }
                else if (expr[i] == ",") {
                    if (depth == 1) {
                        functionArguments.push(Expression.fromString(workingToken));
                        workingToken = "";
                        continue;
                    }
                }
                workingToken += expr[i];
            }
        }
        if (state == ExprState.PARSING_TOKEN) {
            tokens.push(new Token(workingToken));
        }

        // Resolve all of the unary operators
        const stack: Expression[] = [];
        for (let i=0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = i+1 < tokens.length ? tokens[i+1] : null;

            // We're only looking for unary operators hiding as tokens right now
            if (!(token instanceof Token)) {
                stack.push(token);
                continue;
            }

            if (unaryOperators.has(token.value) || (token.value.endsWith(">") && token.value != ">") || token.value.endsWith("?")) {
                if (nextToken === null) {
                    throw Error(`missing operand for unary operator '${token.value}'`);
                }
                stack.push(new UnaryOperator(token.value, nextToken));
                // Consume the next token
                i++;
            }
            else {
                stack.push(token);
            }
        }
        tokens = stack;

        // Resolve all of the binary operators in priority order
        for (const operatorSet of binaryOperatorsByPriority) {
            const stack: Expression[] = [];
            for (let i=0; i < tokens.length; i++) {
                // View a set of 3 tokens at a time
                const previousToken = stack.length > 0 ? stack[stack.length-1] : null;
                const token = tokens[i];
                const nextToken = i+1 < tokens.length ? tokens[i+1] : null;

                // If this isn't a token with an operator in it, it doesn't need to be converted (yet)
                if (!(token instanceof Token) || !operatorSet.has(token.value)) {
                    stack.push(token);
                    continue;
                }

                if (previousToken === null) {
                    throw Error(`missing pre-operand for binary operator '${token.value}'`);
                }
                if (nextToken === null) {
                    throw Error(`missing post-operand for binary operator '${token.value}'`);
                }
                stack.push(new BinaryOperator(token.value, stack.pop(), nextToken));
                // Consume the next token
                i++;
            }
            tokens = stack;
        }

        if (tokens.length == 0) {
            throw Error(`expression missing tokens: '${expr}'`);
        }
        if (tokens.length > 1) {
            throw Error(`expression missing operator: '${expr}'`);
        }
        return tokens[0];
    }
}


export class Token extends Expression {
    value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }

    toRpn(): string {
        return this.value;
    }

    toString(): string {
        return this.value;
    }
}


export class UnaryOperator extends Expression {
    operator: string;
    operand: Expression;

    constructor(operator: string, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }

    toRpn(): string {
        return `${this.operand.toRpn()} ${this.operator}`;
    }

    toString(): string {
        if (this.operand instanceof Token) {
            return `${this.operator} ${this.operand.toString()}`;
        }
        else {
            return `${this.operator} (${this.operand.toString()})`;
        }
    }
}


export class BinaryOperator extends Expression {
    operator: string;
    a_operand: Expression;
    b_operand: Expression;

    constructor(operator: string, a_operand: Expression, b_operand: Expression) {
        super();
        this.operator = operator;
        this.a_operand = a_operand;
        this.b_operand = b_operand;
    }

    toRpn(): string {
        return `${this.a_operand.toRpn()} ${this.b_operand.toRpn()} ${this.operator}`;
    }

    toString(): string {
        let result = "";

        let a_parens = false;
        if (this.a_operand instanceof BinaryOperator) {
            if (!commutativeOperators.has(this.operator)) {
                a_parens = true;
            }
            else if (this.a_operand.operator != this.operator) {
                a_parens = true;
            }
            else {
                a_parens = false;
            }
        }
        
        if (a_parens) {
            result += `(${this.a_operand.toString()})`;
        }
        else {
            result += this.a_operand.toString();
        }

        result += ` ${this.operator} `;

        let b_parens = false;
        if (this.b_operand instanceof BinaryOperator) {
            if (!commutativeOperators.has(this.operator)) {
                b_parens = true;
            }
            else if (this.b_operand.operator != this.operator) {
                b_parens = true;
            }
            else {
                b_parens = false;
            }
        }

        if (b_parens) {
            result += `(${this.b_operand.toString()})`;
        }
        else {
            result += this.b_operand.toString();
        }

        return result;
    }
}

export class FunctionOperator extends Expression {
    name: string;
    operands: Expression[];

    constructor(name: string, operands: Expression[]) {
        super();
        this.name = name;
        this.operands = operands;
    }

    toRpn(): string {
        let result = "";
        for (let i=0; i < this.operands.length; i++) {
            result += this.operands[i].toRpn();
            result += " ";
        }
        result += this.name;
        return result;
    }

    toString(): string {
        let result = this.name + "(";
        for (let i=0; i < this.operands.length; i++) {
            result += this.operands[i].toString();
            if (i < this.operands.length - 1) {
                result += ", ";
            }
        }
        result += ")";
        return result;
    }
}