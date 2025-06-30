import { siGithub } from "simple-icons";

const GithubIcon = ({ className }: { className?: string }) => (
	<svg
		role='img'
		viewBox='0 0 24 24'
		xmlns='http://www.w3.org/2000/svg'
		className={className}
		fill='currentColor'
	>
		<title>{siGithub.title}</title>
		<path d={siGithub.path} />
	</svg>
);

export default GithubIcon;
