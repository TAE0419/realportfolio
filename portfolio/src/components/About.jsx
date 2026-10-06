import { useEffect, useRef } from 'react'
import './About.scss'
import face from '../assets/face.jpg'
import SparkleShape from './SparkleShape'

const experiences = [
  '2023.03 숙명여자대학교 산업디자인과 입학',
  '2024 - 2025 숙명여자대학교 산업디자인과 학생회 활동',
  '2024 - 2027 숙명여자대학교 숙묵지교 동아리 활동',
  '2026.04 - 2026.10 이젠아카데미 프론트엔드 수강',
  '2026.06 - 2026.10 아라후 서포터즈 활동',
]

const skills = [
  { name: 'Illustrator', label: ['Ai'], value: 90 },
  { name: 'After Effects', label: ['Ae'], value: 80 },
  { name: 'Clip Studio Paint', label: ['ClipSt', 'udio'], value: 85 },
  { name: 'Clip Studio Modeler', label: ['ClipSt', 'udio'], value: 75 },
  { name: 'Rhino', label: ['Rhi', 'no'], value: 75 },
  { name: 'KeyShot', label: ['KeyS', 'hot'], value: 95 },
  { name: 'Figma', label: ['Figma'], value: 75 },
  { name: '', label: [], value: 75 },
]

export default function About() {
  const contentRef = useRef(null)

  useEffect(() => {
    const content = contentRef.current
    const section = content.closest('.about-section')
    const targets = [...content.querySelectorAll('.about-content__experiences, .about-content__skills')]
    let frame = 0

    const checkVisibility = () => {
      frame = 0
      if (!section.classList.contains('is-content-visible')) return

      targets.forEach((target) => {
        if (target.classList.contains('is-revealed')) return
        const bounds = target.getBoundingClientRect()
        const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0))
        if (visibleHeight >= Math.min(bounds.height, window.innerHeight) * 0.85) {
          target.classList.add('is-revealed')
        }
      })
    }
    const scheduleCheck = () => {
      if (!frame) frame = window.requestAnimationFrame(checkVisibility)
    }
    const observer = new MutationObserver(scheduleCheck)
    observer.observe(section, { attributes: true, attributeFilter: ['class'] })
    const resizeObserver = new ResizeObserver(scheduleCheck)
    resizeObserver.observe(content)
    window.addEventListener('scroll', scheduleCheck, { passive: true })
    window.addEventListener('resize', scheduleCheck)
    scheduleCheck()

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('scroll', scheduleCheck)
      window.removeEventListener('resize', scheduleCheck)
    }
  }, [])

  return (
    <div className="about-content" ref={contentRef}>
      <img className="about-content__portrait" src={face} alt="김태은 프로필 사진" />
      <div className="about-content__profile">
        <h3 className="about-content__name">KIM TAE EUN <span>김태은</span></h3>
        <dl className="about-content__details">
          <div><dt>birth</dt><dd>2004.04.19</dd></div>
          <div><dt>instar</dt><dd>@tae</dd></div>
          <div><dt>email</dt><dd><a href="mailto:ktcat0419@gmail.com">ktcat0419@gmail.com</a></dd></div>
        </dl>
        <div className="about-content__intro">
          <p>끝을 가늠하기 어려운 심해를 들여다보듯, 어떤 분야를 마주하든 표면에 머무르기보다 본질까지 깊이 파고들어 사유하는 프론트엔드 개발자이자 디자이너 김태은입니다.</p>
          <p>단순히 디자인을 구현하거나 화면을 채우는 것을 넘어, 프로젝트가 전하고자 하는 핵심 가치가 무엇인지를 먼저 고민합니다. 명확한 분석과 흐름을 시각 언어와 인터랙션으로 풀어내어 사용자들에게 전달력 높은 프로젝트를 만들어가고자 합니다.</p>
        </div>
      </div>
      <div className="about-content__experiences">
        <h3>EXPERIENCES</h3>
        <ol>
          {experiences.map((experience, index) => (
            <li key={experience} style={{ '--milestone-delay': `${index * 180}ms` }}>
              <SparkleShape className="about-content__milestone" size={24} color="var(--point-color)" />
              <span>{experience}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="about-content__skills">
        <h3>SKILLS</h3>
        <ul className="about-content__skill-grid">
          {skills.map((skill, index) => (
            <li className="about-content__skill" key={index} aria-label={skill.name || '스킬'}>
              <svg viewBox="0 0 100 100" className="about-content__donut" aria-hidden="true">
                <circle className="about-content__donut-track" cx="50" cy="50" r="46" />
                <circle className="about-content__donut-progress" cx="50" cy="50" r="46" pathLength="100" strokeDasharray="100 100" style={{ '--skill-offset': 100 - skill.value }} />
              </svg>
              <span className="about-content__skill-label">
                {skill.label.map((line) => <span key={line}>{line}</span>)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
