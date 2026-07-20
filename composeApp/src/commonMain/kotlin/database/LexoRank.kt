package database

object LexoRank {
    private const val DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
    private const val BASE = DIGITS.length
    private const val MIN_CHAR = '0'
    private const val MAX_CHAR = 'z'
    private const val MIDDLE_INDEX = BASE / 2

    val MIN_VALUE = MIN_CHAR.toString()
    val MAX_VALUE = MAX_CHAR.toString()

    fun between(prev: String, next: String): String {
        require(prev < next) { "prev must be lexicographically less than next: prev='$prev', next='$next'" }

        var i = 0
        val result = StringBuilder()

        while (true) {
            val p = if (i < prev.length) prev[i] else MIN_CHAR
            val n = if (i < next.length) next[i] else MAX_CHAR

            if (p == n) {
                result.append(p)
                i++
                continue
            }

            val pi = DIGITS.indexOf(p)
            val ni = DIGITS.indexOf(n)

            if (ni - pi > 1) {
                val mid = DIGITS[pi + (ni - pi) / 2]
                result.append(mid)
                break
            } else {
                result.append(p)
                i++
                if (i >= prev.length) {
                    result.append(DIGITS[MIDDLE_INDEX])
                    break
                }
            }
        }

        return result.toString()
    }

    fun after(rank: String): String {
        return between(rank, "zzzzzz")
    }

    fun before(rank: String): String {
        return between("000000", rank)
    }
}
