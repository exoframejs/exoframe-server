# https://github.com/UrsaDK/getopts_long

getopts_long() {
    : "${1:?Missing required parameter -- long optspec}"
    : "${2:?Missing required parameter -- variable name}"

    local optspec_short="${1%% *}-:"
    local optspec_long="${1#* }"
    local optvar="${2}"

    shift 2

    if [[ "${#}" == 0 ]]; then
        local args=()
        while [[ ${#BASH_ARGV[@]} -gt ${#args[@]} ]]; do
            local index=$(( ${#BASH_ARGV[@]} - ${#args[@]} - 1 ))
            args[${#args[@]}]="${BASH_ARGV[${index}]}"
        done
        set -- "${args[@]}"
    fi

    builtin getopts "${optspec_short}" "${optvar}" "${@}" || return 1
    [[ "${!optvar}" == '-' ]] || return 0

    printf -v "${optvar}" "%s" "${OPTARG%%=*}"

    if [[ "${optspec_long}" =~ (^|[[:space:]])${!optvar}:([[:space:]]|$) ]]; then
        OPTARG="${OPTARG#${!optvar}}"
        OPTARG="${OPTARG#=}"

        # Missing argument
        if [[ -z "${OPTARG}" ]]; then
            OPTARG="${!OPTIND}" && OPTIND=$(( OPTIND + 1 ))
            [[ -z "${OPTARG}" ]] || return 0

            if [[ "${optspec_short:0:1}" == ':' ]]; then
                OPTARG="${!optvar}" && printf -v "${optvar}" ':'
            else
                [[ "${OPTERR}" == 0 ]] || \
                    echo "${0}: option requires an argument -- ${!optvar}" >&2
                unset OPTARG && printf -v "${optvar}" '?'
            fi
        fi
    elif [[ "${optspec_long}" =~ (^|[[:space:]])${!optvar}([[:space:]]|$) ]]; then
        unset OPTARG
    else
        # Invalid option
        if [[ "${optspec_short:0:1}" == ':' ]]; then
            OPTARG="${!optvar}"
        else
            [[ "${OPTERR}" == 0 ]] || echo "${0}: illegal option -- ${!optvar}" >&2
            unset OPTARG
        fi
        printf -v "${optvar}" '?'
    fi
}

# https://github.com/ppo/bash-colors
# ┌───────┬─────────┬──────────────────┐   ┌──────┬─────────────────┬──────────┐
# │ Fg/Bg │ Style   │ Octal            |   │ Code │ Style           │ Octal    │
# ├───────┼─────────┼──────────────────┤   ├──────┼─────────────────┼──────────┤
# │  K/k  │ Black   │ \033[ + 3/4 + 0m │   │   s  │ Bold (strong)   │ \033[1m  │
# │  R/r  │ Red     │ \033[ + 3/4 + 1m │   │   u  │ Underline       │ \033[4m  │
# │  G/g  │ Green   │ \033[ + 3/4 + 2m │   │   f  │ Blink (flash)   │ \033[5m  │
# │  Y/y  │ Yellow  │ \033[ + 3/4 + 3m │   │   n  │ Negative        │ \033[7m  │
# │  B/b  │ Blue    │ \033[ + 3/4 + 4m │   ├──────┼─────────────────┼──────────┤
# │  M/m  │ Magenta │ \033[ + 3/4 + 5m │   │   S  │ Normal (unbold) │ \033[22m │
# │  C/c  │ Cyan    │ \033[ + 3/4 + 6m │   │   0  │ Reset           │ \033[0m  │
# │  W/w  │ White   │ \033[ + 3/4 + 7m │   └──────┴─────────────────┴──────────┘
# └───────┴─────────┴──────────────────┘
#
# References:
#  - [WAOW! Complete explanations](https://stackoverflow.com/a/28938235/101831)
#  - [coloring functions](https://gist.github.com/inexorabletash/9122583)

c() { [ $# -eq 0 ] && echo "\033[0m" || echo "$1" | sed -E "s/(.)/‹\1›/g;s/([KRGYBMCW])/3\1/g;s/([krgybmcw])/4\1/g;s/S/22/;y/sufnKRGYBMCWkrgybmcw›/14570123456701234567m/;s/‹/\\\033[/g"; }