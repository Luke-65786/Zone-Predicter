import React from "react";

const coastline =
  "M252 56 324 76 375 52 426 85 481 51 548 75 577 125 634 111 663 153 742 143 781 196 842 214 864 268 838 326 889 378 867 439 909 490 873 549 879 611 820 655 809 727 754 757 741 820 679 837 633 894 564 868 516 915 453 890 398 925 338 873 282 872 257 819 194 791 198 729 140 689 155 629 104 582 133 520 100 467 132 412 109 353 157 315 158 249 207 221 195 159 240 130Z";
const trees = Array.from({ length: 160 }, (_, i) => {
  const x = 130 + ((i * 137.508 + 34) % 735);
  const y = 95 + ((i * 81.37 + i * i * 3.14) % 795);
  return { x, y, r: 7 + (i % 8) };
});

export default function Island() {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="ocean" x2="1" y2="1">
          <stop stopColor="#9dcbd0" />
          <stop offset="1" stopColor="#79b5c0" />
        </linearGradient>
        <linearGradient id="land" x2="0.8" y2="1">
          <stop stopColor="#b5bf83" />
          <stop offset="0.5" stopColor="#8dad72" />
          <stop offset="1" stopColor="#a3bc83" />
        </linearGradient>
        <linearGradient id="snow" x2="0.3" y2="1">
          <stop stopColor="#f3f2dc" />
          <stop offset="1" stopColor="#bdc6a1" />
        </linearGradient>
        <pattern
          id="water-grid"
          width="70"
          height="70"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M70 0H0V70"
            fill="none"
            stroke="#e6f3ef"
            strokeWidth="0.6"
            opacity="0.17"
          />
        </pattern>
        <pattern
          id="fields"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(26)"
        >
          <path
            d="M0 0V24M8 0V24M16 0V24"
            stroke="#617e4b"
            strokeWidth="2"
            opacity="0.2"
          />
        </pattern>
        <clipPath id="island-clip">
          <path d={coastline} />
        </clipPath>
        <filter id="land-shadow">
          <feDropShadow
            dx="0"
            dy="5"
            stdDeviation="9"
            floodColor="#3e8e9b"
            floodOpacity="0.3"
          />
        </filter>
      </defs>
      <path d="M0 0H1000V1000H0Z" fill="url(#ocean)" />
      <path d="M0 0H1000V1000H0Z" fill="url(#water-grid)" />
      <path
        d={coastline}
        fill="none"
        stroke="#d0dfcb"
        strokeWidth="32"
        opacity="0.55"
      />
      <path
        d={coastline}
        fill="url(#land)"
        stroke="#e8dfb6"
        strokeWidth="9"
        filter="url(#land-shadow)"
      />
      <g clipPath="url(#island-clip)">
        <path
          d="m163 124 200-108 239 69 8 174-85 60-60-37-33 28-54-69-132 31-83-70Z"
          fill="url(#snow)"
        />
        <path
          d="m206 103 89 41 59-58 42 72 55-45 61 77 48-35 32 85-63 17-66-47-52 20-65-57-58 28-82-55"
          fill="none"
          stroke="#fff9e3"
          strokeWidth="12"
          opacity="0.43"
        />
        <path
          d="m561 707 144-46 170 6 63 220-366 74-80-138Z"
          fill="#c7b285"
          opacity="0.85"
        />
        <path
          d="m159 352 178-42 80 117-96 160-166-23-35-106Z"
          fill="#728f60"
          opacity="0.65"
        />
        <path
          d="m590 292 201-35 72 222-161 148-109-84 43-85Z"
          fill="#6d9366"
          opacity="0.65"
        />
        <path d="m329 588 149-70 116 106-61 146-173 14-56-88Z" fill="#bdc38a" />
        <path d="m348 613 96-47 110 68-42 99-136 24Z" fill="url(#fields)" />
        <g fill="none" stroke="#426e50" opacity="0.15" strokeWidth="2">
          <path d="M173 331q95-80 165 12t124-11 123 10 178-29M162 353q98-77 165 12t128-10 126 9 190-27M157 376q103-77 166 9t129-5 126 6 196-29M178 784q69-55 135-18t127 13 125 9 165-30M175 807q78-57 141-18t124 16 127 8 160-28M192 829q65-55 128-17t120 16 125 9 150-25" />
          <path d="M679 357q92-58 123 27t-57 116-39 135M665 353q103-70 149 27t-62 136-32 126M654 340q117-73 173 33t-67 157-22 126" />
        </g>
        <g opacity="0.25" fill="#416e46">
          {trees.map((tree, i) => (
            <g key={i}>
              <circle cx={tree.x} cy={tree.y} r={tree.r} />
              <circle cx={tree.x + 7} cy={tree.y - 5} r={tree.r * 0.7} />
            </g>
          ))}
        </g>
        <path
          d="M565 124c-21 87 61 131 9 201s-97 91-62 167 126 107 100 171-104 93-79 236"
          fill="none"
          stroke="#e0dec0"
          strokeWidth="27"
        />
        <path
          d="M565 124c-21 87 61 131 9 201s-97 91-62 167 126 107 100 171-104 93-79 236"
          fill="none"
          stroke="#87bec0"
          strokeWidth="20"
        />
        <path
          d="M514 473c-99-7-157 80-235 41S186 469 127 467"
          fill="none"
          stroke="#d6d7b1"
          strokeWidth="18"
        />
        <path
          d="M514 473c-99-7-157 80-235 41S186 469 127 467"
          fill="none"
          stroke="#87bec0"
          strokeWidth="12"
        />
        <ellipse
          cx="513"
          cy="453"
          rx="52"
          ry="38"
          fill="#87bec0"
          transform="rotate(-30 513 453)"
        />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M256 223 332 305 349 413 295 536 336 657 416 729 562 750 712 685 751 521 714 395 621 285 476 254 332 305M349 413 454 386 573 412 714 395M295 536 420 564 573 587 751 521M420 564 416 729M573 412 573 587 562 750"
            stroke="#748064"
            strokeWidth="13"
            opacity="0.6"
          />
          <path
            d="M256 223 332 305 349 413 295 536 336 657 416 729 562 750 712 685 751 521 714 395 621 285 476 254 332 305M349 413 454 386 573 412 714 395M295 536 420 564 573 587 751 521M420 564 416 729M573 412 573 587 562 750"
            stroke="#d6cfad"
            strokeWidth="7"
          />
          <path
            d="M256 223 332 305 349 413 295 536 336 657 416 729 562 750 712 685 751 521 714 395 621 285 476 254 332 305"
            stroke="#ede5ca"
            strokeWidth="1.4"
            strokeDasharray="7 10"
          />
        </g>
        {[
          [349, 413],
          [714, 395],
          [416, 729],
          [332, 305],
          [712, 685],
          [573, 587],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 13 - 20})`}>
            <rect
              x="-29"
              y="-29"
              width="58"
              height="58"
              rx="4"
              fill="#b3ac92"
            />
            <path d="M-30 0H30M0-30V30" stroke="#e6d9bd" strokeWidth="8" />
            <path
              d="M-23-23h15v15h-15ZM8-23h15v15H8ZM-23 8h15v15h-15ZM8 8h15v15H8Z"
              fill="#7d8275"
            />
            <path
              d="M-22-21h11M10-21h11M-22 10h11M10 10h11"
              stroke="#e1d6b8"
              strokeWidth="3"
            />
          </g>
        ))}
        <g
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="2"
          fill="#334b47"
          opacity="0.7"
          textAnchor="middle"
        >
          <text x="334" y="272">
            NORTH LOOKOUT
          </text>
          <text x="278" y="391">
            WEST RIDGE
          </text>
          <text x="744" y="356">
            THE WOODLANDS
          </text>
          <text x="718" y="727">
            SANDY OUTPOST
          </text>
          <text x="389" y="775">
            LOWLAND FIELDS
          </text>
          <text x="597" y="627">
            RIVER CROSSING
          </text>
        </g>
      </g>
      <g fill="#b6c79a" stroke="#dddcb9" strokeWidth="5">
        <path d="m845 787 34-15 20 25-10 34-36 2-17-22Z" />
        <path d="m113 738 22-6 16 23-15 19-27-8Z" />
        <path d="m754 96 26-7 16 24-24 21-21-15Z" />
      </g>
    </g>
  );
}
