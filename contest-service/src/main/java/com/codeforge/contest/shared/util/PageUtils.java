package com.codeforge.contest.shared.util;

/**
 * Clamps client-supplied page sizes so a single request can't ask the DB for
 * an unbounded result set.
 */
public final class PageUtils {

    public static final int MAX_PAGE_SIZE = 100;

    private PageUtils() {
    }

    public static int clampSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }
}
