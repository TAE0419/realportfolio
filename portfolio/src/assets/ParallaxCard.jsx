
import { useEffect, useRef } from "react";
import "./ParallaxCard.scss";

export default function ParallaxCard() {
  const cardRef = useRef(null);
  const circleRef = useRef(null);
  const smallCircleRef = useRef(null);
  const yearRef = useRef(null);
  const orangeShineRef = useRef(null);
  const thankYouRef = useRef(null);
  const cometRef = useRef(null);

  useEffect(() => {
    const $circle = circleRef.current;
    const $smallCircle = smallCircleRef.current;
    const $year = yearRef.current;
    const $card = cardRef.current;
    const $cardOrangeShine = orangeShineRef.current;
    const $cardThankYou = thankYouRef.current;
    const $cardComet = cometRef.current;

    const generateTranslate = (el, e, value) => {
      el.style.transform = `translate(${e.clientX * value}px, ${e.clientY * value}px)`;
    };

    const cumulativeOffset = (element) => {
      let top = 0;
      let left = 0;

      do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);

      return {
        top: top,
        left: left,
      };
    };

    const handleMouseMove = (event) => {
      const e = event || window.event;

      const x =
        (e.pageX - cumulativeOffset($card).left - 350 / 2) *
        -1 / 100;

      const y =
        (e.pageY - cumulativeOffset($card).top - 350 / 2) *
        -1 / 100;

      const matrix = [
        [1, 0, 0, -x * 0.00005],
        [0, 1, 0, -y * 0.00005],
        [0, 0, 1, 1],
        [0, 0, 0, 1],
      ];

      generateTranslate($smallCircle, e, 0.03);
      generateTranslate($cardThankYou, e, 0.03);
      generateTranslate($cardOrangeShine, e, 0.09);
      generateTranslate($circle, e, 0.05);
      generateTranslate($year, e, 0.03);
      generateTranslate($cardComet, e, 0.05);

      $card.style.transform = `matrix3d(${matrix.toString()})`;
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="wrapper">
      <div className="card" ref={cardRef}>
        <div className="card__year" ref={yearRef}>
          20<br />16
        </div>

        <div className="card__cometOuter" ref={cometRef}>
          <div className="card__comet"></div>
          <div className="card__comet card__comet--second"></div>
        </div>

        <div className="card__circle" ref={circleRef}></div>
        <div className="card__smallCircle" ref={smallCircleRef}></div>

        <div
          className="card__orangeShine"
          ref={orangeShineRef}
        ></div>

        <div className="card__greenShine"></div>

        <div className="card__thankyou" ref={thankYouRef}>
          thank<br />you!
        </div>

        <div className="card__outer-year">
          <span>2</span>
          <span>0</span>
          <span>1</span>
          <span>7</span>
        </div>
      </div>

      <div className="source">
        <strong>Source:</strong>{" "}
        <a
          href="https://dribbble.com/shots/3186204-Thank-you"
          target="_blank"
          rel="noopener noreferrer"
        >
          https://dribbble.com/shots/3186204-Thank-you
        </a>
      </div>
    </div>
  );
}
